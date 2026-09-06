import { afterEach,describe,it,expect,vi } from 'vitest';
import { AuthRepository } from '../src/auth/auth.repository';
import { AuthService,LocalIdentityProvider } from '../src/auth/auth.service';
import { AuditLogService } from '../src/audit-log/audit-log.service';
const now=new Date();
const repository=new AuthRepository();
const service=new AuthService(repository,new LocalIdentityProvider(repository),new AuditLogService());
function session():NonNullable<Awaited<ReturnType<AuthRepository['session']>>>{
  return {id:'s',tokenHash:'hash',userId:'u',membershipId:'m',expiresAt:new Date(Date.now()+60000),revokedAt:null,createdAt:now,user:{id:'u',email:'test@example.test',name:'Test',passwordHash:'never-return-this',active:true,createdAt:now,updatedAt:now,deletedAt:null},membership:{id:'m',userId:'u',organizationId:'o',siteId:null,active:true,createdAt:now,updatedAt:now,site:null,organization:{id:'o',name:'Org',active:true,createdAt:now,updatedAt:now,deletedAt:null}}};
}
afterEach(()=>vi.restoreAllMocks());
describe('session authentication',()=>{
  it('returns only validated actor and tenant context',async()=>{vi.spyOn(repository,'session').mockResolvedValue(session());expect(await service.authenticate('x'.repeat(43))).toEqual({userId:'u',sessionId:'s',membershipId:'m',organizationId:'o',siteId:null});});
  it('rejects missing or malformed cookies before querying storage',async()=>{const spy=vi.spyOn(repository,'session');for(const token of [undefined,null,123,'short'])await expect(service.authenticate(token)).rejects.toThrow('Authentication required');expect(spy).not.toHaveBeenCalled();});
  it('rejects revoked, expired and inactive account/session relationships',async()=>{
    const cases=[()=>({...session(),revokedAt:now}),()=>({...session(),expiresAt:new Date(0)}),()=>{const s=session();s.user.active=false;return s;},()=>{const s=session();s.user.deletedAt=now;return s;},()=>{const s=session();s.membership.active=false;return s;},()=>{const s=session();s.membership.userId='other';return s;},()=>{const s=session();s.membership.organization.active=false;return s;}];
    const spy=vi.spyOn(repository,'session');
    for(const make of cases){spy.mockResolvedValue(make());await expect(service.authenticate('x'.repeat(43))).rejects.toThrow('expired or inactive');}
  });
});
