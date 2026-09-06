import type { Transaction,Task,WorkflowInstance,WorkflowStep,WorkflowTransition } from '@qms/database';
import { audit } from '@qms/database/dist/audit';
import { DomainError,type TenantContext } from '@qms/types';
import { stepSchema,type CreateWorkflowInput,type StepInput,type TransitionInput,type StartWorkflowInput } from '@qms/contracts';
import { assertDraft,assertRunning,validateGraph,nextStep } from './domain';
import { WorkflowRepository,type WorkflowExecution } from './repository';
import { ResourceRegistry } from './registry';
export interface WorkflowTaskPort {
  eligible(tx:Transaction,scope:{organizationId:string;siteId:string|null},userId:string):Promise<void>;
  activate(tx:Transaction,ctx:TenantContext,instance:WorkflowInstance,step:WorkflowStep,executionId:string,userId:string):Promise<void>;
  cancelForInstance(tx:Transaction,ctx:TenantContext,instanceId:string):Promise<void>;
}
/** All commands participate in the caller's serializable transaction. */
export class WorkflowEngine {
  constructor(private readonly repository:WorkflowRepository,private readonly registry:ResourceRegistry,private readonly tasks:WorkflowTaskPort) {}
  async createWorkflow(tx:Transaction,ctx:TenantContext,input:CreateWorkflowInput) {
    this.registry.require(input.resourceType);
    const row=await tx.workflow.create({data:{...input,organizationId:ctx.organizationId,siteId:ctx.siteId}});
    await audit(tx,ctx,'WORKFLOW_CREATED','workflow',row.id);return row;
  }
  async createWorkflowVersion(tx:Transaction,ctx:TenantContext,workflowId:string) {
    const workflow=await this.repository.definition(tx,ctx,workflowId);
    const row=await tx.workflowVersion.create({data:{workflowId,number:(workflow.versions[0]?.number??0)+1}});
    await audit(tx,{...ctx,siteId:workflow.siteId},'WORKFLOW_VERSION_CREATED','workflow',workflowId,'SUCCESS',{version:row.number});return row;
  }
  async addStep(tx:Transaction,ctx:TenantContext,versionId:string,input:StepInput):Promise<WorkflowStep> {
    const version=await this.repository.version(tx,ctx,versionId);assertDraft(version.status);
    await this.tasks.eligible(tx,version.workflow,input.configuration.assignment.userId);
    const row=await tx.workflowStep.create({data:{...input,workflowVersionId:versionId}});
    await audit(tx,{...ctx,siteId:version.workflow.siteId},'WORKFLOW_STEP_ADDED','workflow',version.workflowId);return row;
  }
  async addTransition(tx:Transaction,ctx:TenantContext,versionId:string,input:TransitionInput):Promise<WorkflowTransition> {
    const version=await this.repository.version(tx,ctx,versionId);assertDraft(version.status);
    if(![input.fromStepId,input.toStepId].every(id=>version.steps.some(s=>s.id===id)))throw new DomainError('INVALID','Steps must belong to this version');
    const row=await tx.workflowTransition.create({data:{...input,workflowVersionId:versionId}});
    await audit(tx,{...ctx,siteId:version.workflow.siteId},'WORKFLOW_TRANSITION_ADDED','workflow',version.workflowId);return row;
  }
  async publishWorkflow(tx:Transaction,ctx:TenantContext,versionId:string) {
    const version=await this.repository.version(tx,ctx,versionId);assertDraft(version.status);validateGraph(version.steps,version.transitions);
    for(const step of version.steps){const config=stepSchema.shape.configuration.parse(step.configuration);await this.tasks.eligible(tx,version.workflow,config.assignment.userId);}
    const row=await tx.workflowVersion.update({where:{id:version.id},data:{status:'PUBLISHED',publishedAt:new Date()}});
    await tx.workflow.update({where:{id:version.workflowId},data:{currentVersion:version.number}});
    await audit(tx,{...ctx,siteId:version.workflow.siteId},'WORKFLOW_PUBLISHED','workflow',version.workflowId,'SUCCESS',{version:version.number});return row;
  }
  async startWorkflow(tx:Transaction,ctx:TenantContext,input:StartWorkflowInput) {
    const workflow=await this.repository.definition(tx,ctx,input.workflowId);
    if(workflow.resourceType!==input.targetType||workflow.status!=='ACTIVE')throw new DomainError('INVALID','Workflow target type or status mismatch');
    const target=await this.registry.resolve(tx,ctx,input,'workflow');
    if(workflow.siteId!==null&&workflow.siteId!==target.siteId)throw new DomainError('INVALID','Workflow and resource site mismatch');
    const version=workflow.versions.find(v=>v.number===workflow.currentVersion&&v.status==='PUBLISHED');
    if(!version)throw new DomainError('CONFLICT','No published version');
    const initial=version.steps.find(s=>s.initial);if(!initial)throw new DomainError('CONFLICT','No initial step');
    const instance=await tx.workflowInstance.create({data:{...target,workflowId:workflow.id,workflowVersionId:version.id,targetType:input.targetType,targetId:input.targetId,startedById:ctx.userId,status:'IN_PROGRESS',startedAt:new Date()}});
    await this.activate(tx,ctx,instance,initial);
    await audit(tx,{...ctx,siteId:instance.siteId},'WORKFLOW_STARTED','workflow-instance',instance.id);return instance;
  }
  private async activate(tx:Transaction,ctx:TenantContext,instance:WorkflowInstance,step:WorkflowStep) {
    const config=stepSchema.shape.configuration.parse(step.configuration);
    await this.tasks.eligible(tx,instance,config.assignment.userId);
    const execution=await tx.workflowInstanceStep.create({data:{workflowInstanceId:instance.id,workflowStepId:step.id,status:'IN_PROGRESS',activatedAt:new Date()}});
    await this.tasks.activate(tx,ctx,instance,step,execution.id,config.assignment.userId);
  }
  getWorkflowInstance(tx:Transaction,ctx:TenantContext,id:string):Promise<WorkflowExecution>{return this.repository.instance(tx,ctx,id);}
  async getCurrentStep(tx:Transaction,ctx:TenantContext,id:string):Promise<WorkflowExecution['steps']>{return(await this.repository.instance(tx,ctx,id)).steps.filter(s=>s.status==='IN_PROGRESS');}
  /** Called only by the task engine within the task-completion transaction. */
  async completeWorkflowStep(tx:Transaction,ctx:TenantContext,task:Task,outcome:string) {
    if(!task.workflowInstanceId||!task.workflowInstanceStepId)throw new DomainError('INVALID','Missing workflow task binding');
    const instance=await this.repository.instance(tx,ctx,task.workflowInstanceId);assertRunning(instance.status);
    const execution=instance.steps.find(s=>s.id===task.workflowInstanceStepId);if(!execution||execution.status!=='IN_PROGRESS')throw new DomainError('CONFLICT','Step is not active');
    await this.registry.resolve(tx,ctx,instance,'workflow');
    const nextId=nextStep(execution.step,instance.version.transitions,outcome);
    await tx.workflowInstanceStep.update({where:{id:execution.id},data:{status:'COMPLETED',completedAt:new Date(),completedById:ctx.userId,outcome}});
    await audit(tx,{...ctx,siteId:instance.siteId},'WORKFLOW_STEP_COMPLETED','workflow-instance',instance.id,'SUCCESS',{outcome});
    if(nextId){
      const next=instance.version.steps.find(s=>s.id===nextId);if(!next)throw new DomainError('CONFLICT','Invalid definition');
      await tx.workflowInstance.update({where:{id:instance.id},data:{revision:{increment:1}}});await this.activate(tx,ctx,instance,next);
    }else{
      await tx.workflowInstance.update({where:{id:instance.id},data:{status:'COMPLETED',completedAt:new Date(),revision:{increment:1}}});
      await audit(tx,{...ctx,siteId:instance.siteId},'WORKFLOW_COMPLETED','workflow-instance',instance.id);
    }
  }
  async cancelWorkflow(tx:Transaction,ctx:TenantContext,id:string,rejected=false) {
    const instance=await this.repository.instance(tx,ctx,id);assertRunning(instance.status);
    await this.registry.resolve(tx,ctx,instance,'workflow');await this.tasks.cancelForInstance(tx,ctx,id);
    await tx.workflowInstanceStep.updateMany({where:{workflowInstanceId:id,status:{in:['PENDING','IN_PROGRESS']}},data:{status:rejected?'REJECTED':'CANCELLED'}});
    const row=await tx.workflowInstance.update({where:{id},data:{status:rejected?'REJECTED':'CANCELLED',cancelledAt:new Date(),revision:{increment:1}}});
    await audit(tx,{...ctx,siteId:instance.siteId},rejected?'WORKFLOW_REJECTED':'WORKFLOW_CANCELLED','workflow-instance',id);return row;
  }
}
