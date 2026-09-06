import { Injectable } from '@nestjs/common';
import { hashPassword,verifyPassword,sessionSecret,tokenHash,type IdentityProvider } from '@qms/auth';
import { database,atomic } from '@qms/database';
import { audit } from '@qms/database/dist/audit';
import { environment } from '@qms/config';
import { DomainError,type TenantContext } from '@qms/types';
import type { LoginInput } from '@qms/contracts';
import { AuthRepository } from './auth.repository';
import { AuditLogService } from '../audit-log/audit-log.service';
@Injectable()
export class LocalIdentityProvider implements IdentityProvider {
  private readonly dummy=hashPassword('non-account-dummy-password-for-timing');
  constructor(private readonly repository:AuthRepository) {}
  async authenticate(email:string,password:string) {
    const user=await this.repository.userByEmail(email);
    const valid=await verifyPassword(user?.passwordHash ?? await this.dummy,password);
    return valid && user?.active && !user.deletedAt ? {userId:user.id} : null;
  }
}
@Injectable()
export class AuthService {
  constructor(private readonly repository:AuthRepository,private readonly identity:LocalIdentityProvider,private readonly auditLog:AuditLogService) {}
  async login(input:LoginInput) {
    const identity=await this.identity.authenticate(input.email,input.password);
    if (!identity) { await this.auditLog.record(null,'LOGIN_FAILED','session',null,'DENIED'); throw new DomainError('UNAUTHENTICATED','Invalid credentials'); }
    const user=await this.repository.userByEmail(input.email);
    const membership=user?.memberships.find(m=>m.siteId===null) ?? user?.memberships[0];
    if (!membership || !user) { await this.auditLog.record(null,'LOGIN_FAILED','session',null,'DENIED'); throw new DomainError('UNAUTHENTICATED','Invalid credentials'); }
    const secret=sessionSecret();
    const expiresAt=new Date(Date.now()+environment().SESSION_TTL_SECONDS*1000);
    await atomic(async tx=>{
      const session=await tx.session.create({data:{userId:user.id,membershipId:membership.id,tokenHash:secret.hash,expiresAt}});
      await audit(tx,{...membership,userId:user.id},'LOGIN','session',session.id);
    });
    return {token:secret.token,expiresAt};
  }
  async authenticate(token:unknown):Promise<TenantContext> {
    if (typeof token!=='string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new DomainError('UNAUTHENTICATED','Authentication required');
    const session=await this.repository.session(tokenHash(token));
    const m=session?.membership;
    if (!session || session.revokedAt || session.expiresAt<=new Date() || !session.user.active || session.user.deletedAt || !m?.active || m.userId!==session.userId || !m.organization.active || m.organization.deletedAt || (m.siteId && (!m.site?.active || m.site.deletedAt))) throw new DomainError('UNAUTHENTICATED','Session expired or inactive');
    return {userId:session.userId,sessionId:session.id,membershipId:m.id,organizationId:m.organizationId,siteId:m.siteId};
  }
  async logout(ctx:TenantContext) {
    await atomic(async tx=>{ await tx.session.updateMany({where:{id:ctx.sessionId,userId:ctx.userId},data:{revokedAt:new Date()}}); await audit(tx,ctx,'LOGOUT','session',ctx.sessionId); });
  }
  async switchContext(ctx:TenantContext,membershipId:string) {
    return atomic(async tx=>{
      const m=await tx.membership.findFirst({where:{id:membershipId,userId:ctx.userId,active:true,organization:{active:true,deletedAt:null},OR:[{siteId:null},{site:{active:true,deletedAt:null}}]}});
      if (!m) throw new DomainError('FORBIDDEN','Membership unavailable');
      const secret=sessionSecret(); const expiresAt=new Date(Date.now()+environment().SESSION_TTL_SECONDS*1000);
      await tx.session.updateMany({where:{id:ctx.sessionId,userId:ctx.userId,revokedAt:null},data:{revokedAt:new Date()}});
      const session=await tx.session.create({data:{userId:ctx.userId,membershipId:m.id,tokenHash:secret.hash,expiresAt}});
      await audit(tx,{...m,userId:ctx.userId},'SESSION_CONTEXT_CHANGED','session',session.id);
      return {token:secret.token,expiresAt};
    });
  }
  async current(ctx:TenantContext,permissions:string[]) {
    const user=await database.user.findUniqueOrThrow({where:{id:ctx.userId},select:{id:true,email:true,name:true,active:true}});
    const memberships=await database.membership.findMany({where:{userId:ctx.userId,active:true,organization:{active:true,deletedAt:null},OR:[{siteId:null},{site:{active:true,deletedAt:null}}]},select:{id:true,organizationId:true,siteId:true}});
    return {user,context:{organizationId:ctx.organizationId,siteId:ctx.siteId,membershipId:ctx.membershipId},permissions,memberships};
  }
}
