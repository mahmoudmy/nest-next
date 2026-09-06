# Organization and site tenancy

The session selects one active Membership linking a User to an Organization and optionally a Site. A user can hold separate memberships and different roles in multiple contexts. No default organizationId or siteId is trusted from a request body or header.

`scope(context)` always constrains organizationId. A site membership additionally constrains siteId to exactly that site. An organization membership can query resources in its own organization and sites; site members cannot query organization-wide records or sibling sites. Membership selection verifies ownership and rotates the session cookie.

Resource IDs are never globally fetched and returned without a tenant predicate. Workflow, version, instance, task and file repositories scope lookups and return a generic 404 for unavailable records. Foreign-key relationships additionally enforce organization/site consistency, workflow-to-instance organization consistency, role-to-membership organization consistency, and task-to-instance/step binding.

Polymorphic target types and target IDs require a registered adapter. The adapter verifies the target exists and checks resource-specific access. The registry independently verifies the returned scope. `PLATFORM_SANDBOX` resolves an existing organization ID to organization scope or a site ID to that site's real scope. It does not reinterpret the same target differently based on which user is viewing it.

Assignees require an active user and membership in the target organization. Site tasks accept an eligible site member or organization-wide member. Organization-wide tasks require an organization-wide membership. Deactivated users and foreign members are rejected.

## Future module checklist

1. Include organization/site columns and correct foreign keys in tenant-owned entities.
2. Resolve context from the guard, never from an arbitrary input actorId or tenant ID.
3. Implement a registry adapter that validates existence and module-specific authorization.
4. Scope every read/write and every related-resource lookup.
5. Add negative HTTP and database integration tests for another organization and sibling site.
6. Coordinate resource mutation, execution and audit records inside a shared transaction.

Isolation currently relies on application predicates plus relationship constraints, not PostgreSQL row-level security. Never expose database credentials to the browser or use a privileged Prisma client from future controllers. RLS can be added as defense-in-depth once transaction-local tenant propagation is designed and tested.
