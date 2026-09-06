# PostgreSQL and Prisma

Prisma 6.19 is pinned consistently with its client. The schema lives in packages/database/prisma/schema.prisma. UUIDs identify entities. Timestamps use PostgreSQL timestamp precision 3. Tenant-owned rows carry organization/site context; joins and executions add composite foreign keys where identity alone would not establish scope.

Initial entities: User, Organization, Site, Membership, Role, Permission, RolePermission, MembershipRole, Session, Workflow, WorkflowVersion, WorkflowStep, WorkflowTransition, WorkflowInstance, WorkflowInstanceStep, Task, AuditLog, FileObject. There are no future business-module tables.

```sh
pnpm db:generate
pnpm db:deploy
pnpm prisma migrate dev --name describe_change
pnpm db:seed
# Destructive, development databases only:
pnpm db:reset
```

`migrate deploy` applies committed migrations without schema generation or destructive reset. `migrate dev` requires shadow-database creation privileges on a development database; never run it against production. Reset drops development data, recreates the schema and runs the seed. Back up before schema changes.

The development seed creates one organization, one site, one administrator, one organization membership, foundational permissions and an explicit permission-granted role. It creates an infrastructure-only two-step workflow, a published version, an active instance with assigned workflow task, and an independent ACTION task. Stable seed IDs make reruns idempotent. Existing credentials and completed demo state are not reset. The password comes from the environment and must be at least 14 characters.

## Hand-written database invariants

The migration supplements Prisma with checks/triggers: unique organization-wide membership despite NULL site IDs, task type/link consistency, completion actor/time requirements, immutable published definitions, immutable execution binding, append-only audit records and storage size limits. These are intentionally SQL-owned invariants. Review generated migrations carefully and preserve them. Prisma does not express triggers/check constraints in its schema DSL.

Serializable transactions coordinate publication/version allocation and task/workflow state changes. Atomic command retries handle Prisma P2034 conflicts. Long-running external I/O belongs outside these transactions. Publication locks parent versions to serialize definition edits.

Soft deletion is used for user/organization/site/workflow/task/file lifecycle boundaries. Published versions and audit history must not be silently removed. Runtime database credentials should be non-owner and least-privilege; migrations run under a separate migration principal. The local development account is not a production role template.
