# nest-next

## QMS platform kernel

Infrastructure-only Next.js + NestJS modular monolith. This repository is the `qms/` workspace root; no redundant nested workspace directory is required. No CAPA, deviation, document, audit-management, training, change-control or other QMS business modules are included.

### Start locally

Prerequisites: Node.js 22, pnpm 10.11, Docker Compose v2.

```sh
corepack enable
cp .env.example .env
# Set a unique SEED_ADMIN_PASSWORD of at least 14 characters in .env.
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:deploy
pnpm db:seed
pnpm dev
```

After the first initialization, `docker compose up -d && pnpm dev` starts development. `pnpm dev` generates the client, applies committed migrations, builds shared packages, and launches both applications. It deliberately does not reset data or create default production credentials.

- Web: http://localhost:3000 (redirects to `/qms`)
- API: http://localhost:3001/api/health
- API through the web origin: http://localhost:3000/api/health
- Interactive API reference: http://localhost:3000/api/docs
- OpenAPI JSON: http://localhost:3001/api/openapi.json
- MinIO console: http://localhost:9001 (local-only credentials in Compose)

Sign in with `SEED_ADMIN_EMAIL` and your chosen password. Complete the seeded workflow task, observe the next task, complete that task, and independently complete an ACTION task. Use the REST API to create and publish additional definitions. The console is for infrastructure verification, not a workflow designer.

### Verification

```sh
pnpm lint
pnpm typecheck
pnpm test
# Only against a disposable test database; tests create synthetic users and tenants.
QMS_INTEGRATION_TESTS=1 pnpm test:integration
pnpm build
```

Integration tests need migrated PostgreSQL, initialized MinIO, and the compiled API (`pnpm db:seed` or `pnpm --filter @qms/api build` after shared dependencies build). CI provisions these dependencies and runs every check. Check the actual GitHub Actions result before treating this milestone as verified; source presence alone is not evidence that checks passed.

### Layout

```text
apps/web                 Next.js App Router, one-origin API proxy
apps/api                 NestJS modular monolith, separate Node deployment
packages/contracts       Shared Zod requests/responses
packages/auth            Argon2id, session-token primitives, Casbin model
packages/database        Prisma client, schema, migrations, audit persistence
packages/workflow        Resource registry, graph validation, execution engine
packages/config          Validated server environment
packages/types           Tenant context and domain errors
packages/eslint-config   Shared strict lint rules
packages/tsconfig        Shared strict TypeScript configuration
docker                   Local storage initialization and API image
docs                     Architecture and operational contracts
```

### Deliberate boundaries

The first executor supports acyclic graphs with one active USER_TASK step and explicit outcome-based exclusive branches. Parallel forks/joins, cycles, arbitrary scripts, timers, background workers, e-signatures, validated regulatory compliance, notification delivery, and business modules are not implemented. Unsupported transitions and assignment strategies fail explicitly. Published versions cannot be edited, including by direct SQL. Existing executions retain their version.

The resource registry is not permission to start workflows on invented IDs. Every target must be registered and resolved through a server-side adapter that verifies existence, tenant scope and module-specific access. Only `PLATFORM_SANDBOX` is registered initially, resolving real organization/site IDs for infrastructure testing.

### Documentation

[Architecture](docs/architecture.md) · [Development](docs/development.md) · [Database](docs/database.md) · [Authentication](docs/authentication.md) · [Authorization](docs/authorization.md) · [Tenancy](docs/tenancy.md) · [Workflows](docs/workflow-engine.md) · [Tasks](docs/task-engine.md) · [Files](docs/file-storage.md) · [Deployment](docs/deployment.md)
