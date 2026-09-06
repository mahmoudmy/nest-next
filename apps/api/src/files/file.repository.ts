import { Injectable } from '@nestjs/common';
import { database } from '@qms/database';
import { DomainError,scope,type TenantContext } from '@qms/types';
@Injectable()
export class FileRepository {
  async get(ctx:TenantContext,id:string) { const row=await database.fileObject.findFirst({where:{id,...scope(ctx),deletedAt:null}}); if (!row) throw new DomainError('NOT_FOUND','File not found'); return row; }
}
