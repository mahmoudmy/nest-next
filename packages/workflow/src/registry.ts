import { assertScope, DomainError, type TenantContext, type ResourceScope, type ResourceTarget } from '@qms/types';
import type { Transaction } from '@qms/database';
export interface ResourceAdapter {
  /** Verify existence, tenant relationship and module-specific authorization before returning scope. */
  resolve(tx:Transaction,ctx:TenantContext,id:string,action:'workflow'|'task'|'file'):Promise<ResourceScope>;
}
export class ResourceRegistry {
  private readonly adapters = new Map<string,ResourceAdapter>();
  register(type:string,adapter:ResourceAdapter) {
    if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(type) || this.adapters.has(type)) throw new Error('Invalid or duplicate resource registration');
    this.adapters.set(type,adapter);
  }
  require(type:string) { const adapter=this.adapters.get(type); if (!adapter) throw new DomainError('INVALID','Unregistered resource type'); return adapter; }
  async resolve(tx:Transaction,ctx:TenantContext,target:ResourceTarget,action:'workflow'|'task'|'file') {
    const resource = await this.require(target.targetType).resolve(tx,ctx,target.targetId,action);
    assertScope(ctx,resource); return resource;
  }
}
