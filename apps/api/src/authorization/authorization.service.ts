import { Injectable } from '@nestjs/common';
import { database } from '@qms/database';
import { policyEnforcer,domain } from '@qms/auth';
import { DomainError,type TenantContext } from '@qms/types';
import { AuditLogService } from '../audit-log/audit-log.service';
@Injectable()
export class AuthorizationService {
  constructor(private readonly audit:AuditLogService) {}
  private async roles(ctx:TenantContext) {
    const membership=await database.membership.findFirst({where:{id:ctx.membershipId,userId:ctx.userId,organizationId:ctx.organizationId,siteId:ctx.siteId,active:true},include:{roles:{include:{role:{include:{permissions:{include:{permission:true}}}}}}}});
    return membership?.roles.map(r=>({id:r.role.id,permissions:r.role.permissions.map(p=>p.permission)})) ?? [];
  }
  async require(ctx:TenantContext,resource:string,action:string) {
    // Request-local enforcers prevent stale grants and cross-request tenant policy leakage.
    const enforcer=await policyEnforcer(ctx,await this.roles(ctx));
    if (!await enforcer.enforce(ctx.userId,domain(ctx),resource,action)) { await this.audit.record(ctx,'PERMISSION_DENIED',resource,null,'DENIED'); throw new DomainError('FORBIDDEN','Permission denied'); }
  }
  async permissions(ctx:TenantContext) { return [...new Set((await this.roles(ctx)).flatMap(r=>r.permissions.map(p=>`${p.resource}:${p.action}`)))].sort(); }
}
