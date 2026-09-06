export interface TenantContext { readonly userId: string; readonly organizationId: string; readonly siteId: string | null; readonly membershipId: string; readonly sessionId: string }
export interface ResourceTarget { targetType: string; targetId: string }
export interface ResourceScope { organizationId: string; siteId: string | null }
export class DomainError extends Error {
  constructor(public readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'INVALID' | 'UNAUTHENTICATED', message: string) { super(message); }
}
export function scope(context: TenantContext) { return { organizationId: context.organizationId, ...(context.siteId ? {siteId: context.siteId} : {}) }; }
export function assertScope(context: TenantContext, resource: ResourceScope): void {
  if (resource.organizationId !== context.organizationId || (context.siteId !== null && resource.siteId !== context.siteId)) throw new DomainError('NOT_FOUND','Resource not found');
}
