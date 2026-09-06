import type { Task,Transaction,WorkflowInstance,WorkflowStep } from '@qms/database';
import { audit } from '@qms/database/dist/audit';
import { DomainError,type TenantContext,type ResourceScope } from '@qms/types';
import type { TaskInput } from '@qms/contracts';
import { ResourceRegistry,type WorkflowTaskPort } from '@qms/workflow';
import { TaskRepository } from './task.repository';
import { assertTaskTransition,assertAssignee } from './task.domain';
/** Task state belongs here. Workflow state is delegated through an explicit transaction callback. */
export class TaskService implements WorkflowTaskPort {
  constructor(private readonly repository:TaskRepository,private readonly registry:ResourceRegistry) {}
  async eligible(tx:Transaction,resource:ResourceScope,userId:string) {
    const membership=await tx.membership.findFirst({where:{userId,organizationId:resource.organizationId,active:true,user:{active:true,deletedAt:null},organization:{active:true,deletedAt:null},OR:resource.siteId?[{siteId:null},{siteId:resource.siteId,site:{active:true,deletedAt:null}}]:[{siteId:null}]}});
    if (!membership) throw new DomainError('INVALID','Assignee is not eligible in this resource scope');
  }
  async activate(tx:Transaction,ctx:TenantContext,instance:WorkflowInstance,step:WorkflowStep,executionId:string,userId:string) {
    await this.eligible(tx,instance,userId);
    const row=await tx.task.create({data:{organizationId:instance.organizationId,siteId:instance.siteId,type:'WORKFLOW',title:step.name,targetType:instance.targetType,targetId:instance.targetId,assignedToUserId:userId,workflowInstanceId:instance.id,workflowInstanceStepId:executionId}});
    await audit(tx,{...ctx,siteId:instance.siteId},'TASK_CREATED','task',row.id);
    await audit(tx,{...ctx,siteId:instance.siteId},'TASK_ASSIGNED','task',row.id);
  }
  async create(tx:Transaction,ctx:TenantContext,input:TaskInput) {
    const resource=await this.registry.resolve(tx,ctx,input,'task'); await this.eligible(tx,resource,input.assignedToUserId);
    const row=await tx.task.create({data:{...input,...resource,type:'ACTION',dueAt:input.dueAt?new Date(input.dueAt):null}});
    await audit(tx,{...ctx,siteId:resource.siteId},'TASK_CREATED','task',row.id); await audit(tx,{...ctx,siteId:resource.siteId},'TASK_ASSIGNED','task',row.id); return row;
  }
  async assign(tx:Transaction,ctx:TenantContext,id:string,userId:string) {
    const task=await this.repository.get(tx,ctx,id);
    if (!['PENDING','IN_PROGRESS'].includes(task.status)) throw new DomainError('CONFLICT','Cannot assign a terminal task');
    await this.registry.resolve(tx,ctx,task,'task'); await this.eligible(tx,task,userId);
    const row=await tx.task.update({where:{id},data:{assignedToUserId:userId}});
    await audit(tx,{...ctx,siteId:task.siteId},'TASK_ASSIGNED','task',id); return row;
  }
  async start(tx:Transaction,ctx:TenantContext,id:string) {
    const task=await this.repository.get(tx,ctx,id); assertAssignee(task.assignedToUserId,ctx.userId); assertTaskTransition(task.status,'IN_PROGRESS');
    await this.registry.resolve(tx,ctx,task,'task');
    const row=await tx.task.update({where:{id},data:{status:'IN_PROGRESS'}});
    await audit(tx,{...ctx,siteId:task.siteId},'TASK_STARTED','task',id); return row;
  }
  async complete(tx:Transaction,ctx:TenantContext,id:string,outcome:string,onWorkflow:(task:Task)=>Promise<void>) {
    const task=await this.repository.get(tx,ctx,id); assertAssignee(task.assignedToUserId,ctx.userId); assertTaskTransition(task.status,'COMPLETED');
    await this.registry.resolve(tx,ctx,task,'task'); await this.eligible(tx,task,ctx.userId);
    if (task.type==='ACTION' && outcome!=='complete') throw new DomainError('INVALID','Action tasks require complete outcome');
    const row=await tx.task.update({where:{id},data:{status:'COMPLETED',completedAt:new Date(),completedById:ctx.userId}});
    if (task.type==='WORKFLOW') await onWorkflow(row);
    await audit(tx,{...ctx,siteId:task.siteId},'TASK_COMPLETED','task',id,'SUCCESS',{beforeStatus:task.status,afterStatus:'COMPLETED',outcome}); return row;
  }
  async cancel(tx:Transaction,ctx:TenantContext,id:string) {
    const task=await this.repository.get(tx,ctx,id);
    if (task.type==='WORKFLOW') throw new DomainError('CONFLICT','Cancel the workflow instance instead');
    assertTaskTransition(task.status,'CANCELLED'); await this.registry.resolve(tx,ctx,task,'task');
    const row=await tx.task.update({where:{id},data:{status:'CANCELLED'}}); await audit(tx,{...ctx,siteId:task.siteId},'TASK_CANCELLED','task',id); return row;
  }
  async cancelForInstance(tx:Transaction,ctx:TenantContext,instanceId:string) {
    const tasks=await tx.task.findMany({where:{workflowInstanceId:instanceId,organizationId:ctx.organizationId,status:{in:['PENDING','IN_PROGRESS']}}});
    for (const task of tasks) { assertTaskTransition(task.status,'CANCELLED'); await tx.task.update({where:{id:task.id},data:{status:'CANCELLED'}}); await audit(tx,{...ctx,siteId:task.siteId},'TASK_CANCELLED','task',task.id); }
  }
}
