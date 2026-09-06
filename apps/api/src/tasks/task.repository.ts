import { Injectable } from '@nestjs/common';
import type { Transaction } from '@qms/database';
import { DomainError,scope,type TenantContext } from '@qms/types';
@Injectable()
export class TaskRepository {
  async get(tx:Transaction,ctx:TenantContext,id:string) { const row=await tx.task.findFirst({where:{id,...scope(ctx),deletedAt:null}}); if (!row) throw new DomainError('NOT_FOUND','Task not found'); return row; }
  list(tx:Transaction,ctx:TenantContext) { return tx.task.findMany({where:{...scope(ctx),deletedAt:null},orderBy:[{createdAt:'desc'},{id:'desc'}],take:100}); }
}
