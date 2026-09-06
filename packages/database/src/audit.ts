import type { Transaction } from './index';
export interface AuditContext { organizationId:string; siteId:string|null; userId:string }
export interface AuditMetadata { beforeStatus?:string; afterStatus?:string; outcome?:string; reason?:string; version?:number }
/** Typed, allowlisted metadata only. Never pass request bodies, headers or errors here. */
export function audit(tx:Transaction,ctx:AuditContext|null,action:string,resourceType:string,resourceId:string|null,result='SUCCESS',metadata:AuditMetadata={}) {
  const {beforeStatus,afterStatus,outcome,reason,version} = metadata;
  return tx.auditLog.create({data:{organizationId:ctx?.organizationId,siteId:ctx?.siteId,actorId:ctx?.userId,action,resourceType,resourceId,result,metadata:{beforeStatus,afterStatus,outcome,reason,version}}});
}
