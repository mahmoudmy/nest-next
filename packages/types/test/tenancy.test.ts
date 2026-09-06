import { it,expect } from 'vitest';
import { assertScope,scope,type TenantContext } from '../src/index';
const ctx:TenantContext={userId:'u',organizationId:'a',siteId:'a1',membershipId:'m',sessionId:'s'};
it('denies foreign organizations and sibling sites',()=>{expect(()=>assertScope(ctx,{organizationId:'b',siteId:'a1'})).toThrow('Resource not found');expect(()=>assertScope(ctx,{organizationId:'a',siteId:'a2'})).toThrow();expect(()=>assertScope(ctx,{organizationId:'a',siteId:null})).toThrow();expect(()=>assertScope(ctx,{organizationId:'a',siteId:'a1'})).not.toThrow();});
it('organization scope includes its sites, never other organizations',()=>{expect(scope({...ctx,siteId:null})).toEqual({organizationId:'a'});expect(scope(ctx)).toEqual({organizationId:'a',siteId:'a1'});expect(()=>assertScope({...ctx,siteId:null},{organizationId:'b',siteId:null})).toThrow();});
