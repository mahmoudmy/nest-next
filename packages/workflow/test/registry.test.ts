import { it,expect } from 'vitest';
import { ResourceRegistry } from '../src/registry';
import type { Transaction } from '@qms/database';
import type { TenantContext } from '@qms/types';
const ctx:TenantContext={organizationId:'a',siteId:null,userId:'u',membershipId:'m',sessionId:'s'};
// Adapter-only unit test: the repository argument is deliberately unused by these adapters.
const tx={} as Transaction;
it('rejects arbitrary unregistered targets and duplicate registration',async()=>{const registry=new ResourceRegistry();await expect(registry.resolve(tx,ctx,{targetType:'UNREGISTERED',targetId:'1'},'workflow')).rejects.toThrow('Unregistered');registry.register('INFRA_TEST',{resolve:async()=>({organizationId:'a',siteId:null})});expect(()=>registry.register('INFRA_TEST',{resolve:async()=>({organizationId:'a',siteId:null})})).toThrow('duplicate');});
it('delegates polymorphic resolution but independently enforces tenant boundaries',async()=>{const registry=new ResourceRegistry();registry.register('INFRA_TEST',{resolve:async(_tx,_ctx,id)=>({organizationId:id,siteId:null})});expect(await registry.resolve(tx,ctx,{targetType:'INFRA_TEST',targetId:'a'},'task')).toEqual({organizationId:'a',siteId:null});await expect(registry.resolve(tx,ctx,{targetType:'INFRA_TEST',targetId:'b'},'workflow')).rejects.toThrow('Resource not found');});
