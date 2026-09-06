import { describe,it,expect } from 'vitest';
import { hashPassword,verifyPassword,sessionSecret,tokenHash,policyEnforcer,domain } from '../src/index';
import type { TenantContext } from '@qms/types';
const ctx:TenantContext={userId:'user-a',organizationId:'org-a',siteId:'site-a',membershipId:'membership-a',sessionId:'session-a'};
describe('authentication primitives',()=>{
  it('uses Argon2id and rejects incorrect passwords',async()=>{const hash=await hashPassword('a-unique-long-password');expect(hash).toMatch(/^\$argon2id\$/);expect(await verifyPassword(hash,'a-unique-long-password')).toBe(true);expect(await verifyPassword(hash,'incorrect')).toBe(false);});
  it('salts independent password hashes',async()=>{expect(await hashPassword('same-password')).not.toBe(await hashPassword('same-password'));});
  it('stores only a digest of a high-entropy session token',()=>{const one=sessionSecret();const two=sessionSecret();expect(one.token).toHaveLength(43);expect(one.hash).toHaveLength(64);expect(one.hash).toBe(tokenHash(one.token));expect(one.token).not.toBe(two.token);expect(one.hash).not.toContain(one.token);});
});
describe('domain-aware Casbin RBAC',()=>{
  it('allows explicit grants only within the assigned domain',async()=>{const e=await policyEnforcer(ctx,[{id:'reviewer',permissions:[{resource:'task',action:'read'}]}]);expect(await e.enforce('user-a',domain(ctx),'task','read')).toBe(true);expect(await e.enforce('user-a','org-b/site-a','task','read')).toBe(false);expect(await e.enforce('user-a','org-a/site-b','task','read')).toBe(false);expect(await e.enforce('user-b',domain(ctx),'task','read')).toBe(false);expect(await e.enforce('user-a',domain(ctx),'task','complete')).toBe(false);});
  it('defaults to deny and does not retain another request policy',async()=>{const e=await policyEnforcer(ctx,[]);expect(await e.enforce(ctx.userId,domain(ctx),'workflow','publish')).toBe(false);});
});
