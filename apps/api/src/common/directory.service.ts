import { Injectable } from '@nestjs/common';
import { database,atomic } from '@qms/database';
import { audit } from '@qms/database/dist/audit';
import { DomainError,scope,type TenantContext } from '@qms/types';
@Injectable()
export class DirectoryService {
  users(ctx:TenantContext) { return database.user.findMany({where:{deletedAt:null,memberships:{some:{...scope(ctx),active:true}}},select:{id:true,email:true,name:true,active:true},take:100,orderBy:{name:'asc'}}); }
  organizations(ctx:TenantContext) { return database.organization.findMany({where:{id:ctx.organizationId,deletedAt:null},select:{id:true,name:true,active:true}}); }
  sites(ctx:TenantContext) { return database.site.findMany({where:{organizationId:ctx.organizationId,...(ctx.siteId?{id:ctx.siteId}:{}),deletedAt:null},take:100,orderBy:{name:'asc'}}); }
  memberships(ctx:TenantContext) { return database.membership.findMany({where:scope(ctx),select:{id:true,userId:true,organizationId:true,siteId:true,active:true,roles:{select:{roleId:true}}},take:100,orderBy:{createdAt:'desc'}}); }
  roles(ctx:TenantContext) { return database.role.findMany({where:{organizationId:ctx.organizationId},include:{permissions:{include:{permission:true}}},take:100,orderBy:{name:'asc'}}); }
  permissions() { return database.permission.findMany({orderBy:[{resource:'asc'},{action:'asc'}],take:200}); }
  async activate(ctx:TenantContext,id:string,active:boolean) {
    return atomic(async tx=>{
      // Global account state cannot be changed by a site administrator or across other organizations.
      if (ctx.siteId || id===ctx.userId) throw new DomainError('FORBIDDEN','Cannot change this account');
      const user=await tx.user.findFirst({where:{id,deletedAt:null,memberships:{some:{organizationId:ctx.organizationId},every:{organizationId:ctx.organizationId}}}});
      if (!user) throw new DomainError('NOT_FOUND','Account not found in exclusive organization scope');
      const updated=await tx.user.update({where:{id},data:{active},select:{id:true,email:true,name:true,active:true}});
      if (!active) await tx.session.updateMany({where:{userId:id,revokedAt:null},data:{revokedAt:new Date()}});
      await audit(tx,ctx,active?'USER_ACTIVATED':'USER_DEACTIVATED','user',id); return updated;
    });
  }
}
