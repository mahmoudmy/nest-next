import type { Transaction } from '@qms/database';
import { DomainError, scope, type TenantContext } from '@qms/types';
export class WorkflowRepository {
  async definition(tx:Transaction,ctx:TenantContext,id:string) {
    const row = await tx.workflow.findFirst({where:{id,...scope(ctx),deletedAt:null},include:{versions:{orderBy:{number:'desc'},include:{steps:true,transitions:true}}}});
    if (!row) throw new DomainError('NOT_FOUND','Workflow not found'); return row;
  }
  async version(tx:Transaction,ctx:TenantContext,id:string) {
    const row = await tx.workflowVersion.findFirst({where:{id,workflow:{...scope(ctx),deletedAt:null}},include:{workflow:true,steps:true,transitions:true}});
    if (!row) throw new DomainError('NOT_FOUND','Workflow version not found'); return row;
  }
  async instance(tx:Transaction,ctx:TenantContext,id:string) {
    const row = await tx.workflowInstance.findFirst({where:{id,...scope(ctx)},include:{steps:{include:{step:true}},version:{include:{steps:true,transitions:true}}}});
    if (!row) throw new DomainError('NOT_FOUND','Workflow instance not found'); return row;
  }
}
