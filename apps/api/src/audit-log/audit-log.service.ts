import { Injectable } from '@nestjs/common';
import { database } from '@qms/database';
import { audit, type AuditContext, type AuditMetadata } from '@qms/database/dist/audit';
import { scope, type TenantContext } from '@qms/types';
@Injectable()
export class AuditLogService {
  record(ctx:AuditContext|null,action:string,resourceType:string,resourceId:string|null,result='SUCCESS',metadata:AuditMetadata={}) { return audit(database,ctx,action,resourceType,resourceId,result,metadata); }
  list(ctx:TenantContext) { return database.auditLog.findMany({where:scope(ctx),orderBy:[{createdAt:'desc'},{id:'desc'}],take:100}); }
}
