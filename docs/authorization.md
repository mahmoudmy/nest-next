# Authorization

Backend guards enforce Casbin domain-aware RBAC. UI checks only hide unavailable controls and are never authoritative.

```text
request: subject, domain, resource, action
policy:  role, domain, resource, action
group:   subject, role, domain
domain:  organizationId/siteId (or organizationId/organization)
```

An active membership owns role assignments. Roles belong to organizations, and composite foreign keys prohibit assigning a role from another organization. RolePermission joins the extensible Permission catalog. An enforcer is constructed per request from the validated membership, avoiding global policy leakage or stale role caches. Only exact resource/action matches grant access; no wildcard administrator bypass exists.

The catalog includes foundational user, organization, site, membership, role, permission, workflow, workflow-instance, task, file and audit-log resources. Workflow permissions include read/create/update/delete/publish. Task permissions include read/create/assign/start/complete/cancel. Future modules may add their own resource/action rows and role grants without altering the central Casbin matcher. No business-module permissions are seeded.

Authorization and tenant scoping are separate requirements. A granted task:complete permission does not permit reading a foreign tenant, completing another user's task, reopening completed work, or selecting an unregistered target. These are enforced by repositories and domain services after the guard.

Every denial produced by the central guard writes `PERMISSION_DENIED` with allowlisted metadata and no request payload. Denied existence-sensitive lookups return 404 to avoid revealing foreign IDs. Audit query access itself requires audit-log:read and is scoped to the current tenant.

Role/catalog endpoints are currently read-only. Provisioning and policy changes use reviewed database migrations/administrative code, not browser-supplied role names. A future administrative API must protect its own grants against privilege escalation.
