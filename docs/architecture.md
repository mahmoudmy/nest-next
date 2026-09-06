# Architecture

## System boundary

```text
Browser -> one public origin
  /qms/* -> Next.js App Router (:3000 in development)
  /api/* -> NestJS modular monolith (:3001 in development)
                  |-> PostgreSQL / Prisma
                  |-> private S3-compatible storage
Browser -----------> S3 using scoped, short-lived signed URLs
```

Next.js rewrites `/api/:path*` to `API_INTERNAL_URL/api/:path*`. No browser API client knows the API host or stores secrets. Next.js and NestJS remain independently deployable. The backend is not a serverless function or a collection of microservices.

## Boundaries and command execution

Controllers handle HTTP binding only. Shared Zod DTOs reject unexpected properties. Session and Casbin guards execute before application commands. `PlatformApplication` owns serializable transaction boundaries and coordinates task and workflow services. Domain functions define valid graph and lifecycle rules. Tenant-aware repositories resolve resources; Prisma persists definitions, instances, tasks, sessions, and append-only audit records.

Database mutations made by the engines accept a caller-supplied `Transaction`. Future modules should use a tenant-authenticated application facade to create their resource and start the workflow in the same transaction. Do not call the engines from unauthenticated controllers or create a new Prisma client inside a command. Retrying a serializable conflict replays the entire command, including its audit writes, up to three times. Keep external effects out of retried transactions.

## Shared packages

- `contracts`: frontend/backend validation and response shapes, never authorization decisions.
- `auth`: password/session primitives, domain RBAC model, permission catalog.
- `database`: generated Prisma API, transaction boundary helper, allowlisted audit persistence.
- `workflow`: framework-independent graph rules, resource adapter registry and version-bound execution.
- `types`: explicit validated tenant context and stable domain error categories.
- `config`: server environment only. Never import it into browser components.

The task engine remains separate from workflow execution. The workflow engine depends on a small task port to activate/cancel tasks. Task completion invokes the workflow engine through an explicit transaction callback. There is no Nest circular injection or duplicated execution state in a task.

## Ownership and guarantees

Workflow versions own immutable definitions. Instances own progress. Instance steps record executed definitions and outcomes. Tasks own assignment, task lifecycle and completion actor/time. Audit records are committed atomically with successful commands; authentication failures and authorization denials are written outside a failed business transaction.

## Limitations, not simulated features

Read collections currently return a bounded most-recent page (100, or 200 permission entries). Full administrative CRUD, cursor pagination, background delivery and parallel graph execution are future increments, not stub endpoints. Logs are intentionally minimal and omit request bodies and secrets; production still needs correlated, redacted operational telemetry. This foundation is not a claim of ISO, GxP or 21 CFR Part 11 certification.
