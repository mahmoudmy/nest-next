import { database,atomic,type Transaction } from '@qms/database';
import { audit } from '@qms/database/dist/audit';
import { WorkflowEngine,WorkflowRepository,ResourceRegistry } from '@qms/workflow';
import { DomainError,scope,type TenantContext } from '@qms/types';
import type { CreateWorkflowInput,StepInput,TransitionInput,StartWorkflowInput,TaskInput } from '@qms/contracts';
import { TaskRepository } from '../tasks/task.repository';
import { TaskService } from '../tasks/task.service';
/** Composition root: modules register adapters here, not inside the workflow engine. */
export const resourceRegistry=new ResourceRegistry();
resourceRegistry.register('PLATFORM_SANDBOX',{async resolve(tx,ctx,id) {
  const organization=await tx.organization.findFirst({where:{id,active:true,deletedAt:null}});
  if (!organization || id!==ctx.organizationId) throw new DomainError('NOT_FOUND','Resource not found');
  // This infrastructure-only target belongs to the validated current membership context.
  return {organizationId:organization.id,siteId:ctx.siteId};
}});
export const taskRepository=new TaskRepository();
export const taskEngine=new TaskService(taskRepository,resourceRegistry);
export const workflowRepository=new WorkflowRepository();
export const workflowEngine=new WorkflowEngine(workflowRepository,resourceRegistry,taskEngine);
export class PlatformApplication {
  private async command<T>(ctx:TenantContext,operation:(tx:Transaction)=>Promise<T>):Promise<T> {
    try { return await atomic(operation); } catch(error) {
      if (error instanceof DomainError && error.code==='FORBIDDEN') await audit(database,ctx,'PERMISSION_DENIED','platform',null,'DENIED');
      throw error;
    }
  }
  workflows(ctx:TenantContext) { return database.workflow.findMany({where:{...scope(ctx),deletedAt:null},orderBy:{createdAt:'desc'},take:100}); }
  workflow(ctx:TenantContext,id:string) { return workflowRepository.definition(database,ctx,id); }
  createWorkflow(ctx:TenantContext,input:CreateWorkflowInput) { return this.command(ctx,tx=>workflowEngine.createWorkflow(tx,ctx,input)); }
  version(ctx:TenantContext,id:string) { return this.command(ctx,tx=>workflowEngine.createWorkflowVersion(tx,ctx,id)); }
  step(ctx:TenantContext,id:string,input:StepInput) { return this.command(ctx,tx=>workflowEngine.addStep(tx,ctx,id,input)); }
  transition(ctx:TenantContext,id:string,input:TransitionInput) { return this.command(ctx,tx=>workflowEngine.addTransition(tx,ctx,id,input)); }
  publish(ctx:TenantContext,id:string) { return this.command(ctx,tx=>workflowEngine.publishWorkflow(tx,ctx,id)); }
  archiveWorkflow(ctx:TenantContext,id:string) { return this.command(ctx,async tx=>{ await workflowRepository.definition(tx,ctx,id); const row=await tx.workflow.update({where:{id},data:{deletedAt:new Date(),status:'ARCHIVED'}}); await audit(tx,ctx,'WORKFLOW_ARCHIVED','workflow',id); return row; }); }
  startWorkflow(ctx:TenantContext,input:StartWorkflowInput) { return this.command(ctx,tx=>workflowEngine.startWorkflow(tx,ctx,input)); }
  instance(ctx:TenantContext,id:string) { return workflowEngine.getWorkflowInstance(database,ctx,id); }
  instances(ctx:TenantContext) { return database.workflowInstance.findMany({where:scope(ctx),orderBy:{createdAt:'desc'},take:100}); }
  currentSteps(ctx:TenantContext,id:string) { return workflowEngine.getCurrentStep(database,ctx,id); }
  cancelWorkflow(ctx:TenantContext,id:string,rejected=false) { return this.command(ctx,tx=>workflowEngine.cancelWorkflow(tx,ctx,id,rejected)); }
  tasks(ctx:TenantContext) { return taskRepository.list(database,ctx); }
  task(ctx:TenantContext,id:string) { return taskRepository.get(database,ctx,id); }
  createTask(ctx:TenantContext,input:TaskInput) { return this.command(ctx,tx=>taskEngine.create(tx,ctx,input)); }
  assignTask(ctx:TenantContext,id:string,userId:string) { return this.command(ctx,tx=>taskEngine.assign(tx,ctx,id,userId)); }
  startTask(ctx:TenantContext,id:string) { return this.command(ctx,tx=>taskEngine.start(tx,ctx,id)); }
  completeTask(ctx:TenantContext,id:string,outcome:string) { return this.command(ctx,tx=>taskEngine.complete(tx,ctx,id,outcome,task=>workflowEngine.completeWorkflowStep(tx,ctx,task,outcome))); }
  cancelTask(ctx:TenantContext,id:string) { return this.command(ctx,tx=>taskEngine.cancel(tx,ctx,id)); }
}
