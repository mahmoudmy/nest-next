import { hash, verify, argon2id } from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { newEnforcer, newModelFromString } from 'casbin';
import type { TenantContext } from '@qms/types';
export const hashPassword = (password: string) => hash(password,{type:argon2id,memoryCost:65536,timeCost:3,parallelism:1});
export const verifyPassword = (encoded: string, password: string) => verify(encoded,password);
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export function sessionSecret() { const token = randomBytes(32).toString('base64url'); return {token,hash:tokenHash(token)}; }
/** Replace credentials verification without changing browser session handling when adding an IdP. */
export interface IdentityProvider { authenticate(email: string, password: string): Promise<{userId:string} | null> }
export const model = `[request_definition]
r = sub, dom, obj, act
[policy_definition]
p = sub, dom, obj, act
[role_definition]
g = _, _, _
[policy_effect]
e = some(where (p.eft == allow))
[matchers]
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && r.obj == p.obj && r.act == p.act`;
export interface RolePolicy { id:string; permissions: ReadonlyArray<{resource:string;action:string}> }
export const domain = (ctx: Pick<TenantContext,'organizationId'|'siteId'>) => `${ctx.organizationId}/${ctx.siteId ?? 'organization'}`;
export async function policyEnforcer(ctx:TenantContext, roles:ReadonlyArray<RolePolicy>) {
  const enforcer = await newEnforcer(newModelFromString(model));
  const dom = domain(ctx);
  for (const role of roles) {
    await enforcer.addGroupingPolicy(ctx.userId,role.id,dom);
    for (const permission of role.permissions) await enforcer.addPolicy(role.id,dom,permission.resource,permission.action);
  }
  return enforcer;
}
export const foundationPermissions: Record<string,readonly string[]> = {
  user:['read','activate'],organization:['read'],site:['read'],membership:['read'],role:['read'],permission:['read'],
  workflow:['read','create','update','delete','publish'],'workflow-instance':['read','start','cancel'],
  task:['read','create','assign','start','complete','cancel'],file:['upload','download'],'audit-log':['read']
};
