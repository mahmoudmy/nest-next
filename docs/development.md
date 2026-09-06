# Development and verification

## First run

```sh
corepack enable
cp .env.example .env
# Edit SEED_ADMIN_PASSWORD; do not commit .env.
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:deploy
pnpm db:seed
pnpm dev
```

MinIO initialization creates a private bucket. If MinIO startup is still in progress, its initialization container retries until available. PostgreSQL exposes a readiness probe. Credentials in Compose are local development values and ports bind to loopback only.

The backend uses TypeScript's compiler for decorator metadata, not a transpiler that silently omits Nest constructor injection metadata. Development watches compiled API output. Turbo builds dependency packages before launching either app; restart development after a shared-package source change or run that package's compiler in watch mode.

## Checks

Run lint, typecheck, unit tests and build after each major increment. Integration tests exercise the compiled Nest application through HTTP with real PostgreSQL and MinIO, not mocked tenant queries. They create synthetic organizations/users and intentionally retain audit history. Run only against a disposable database and opt in explicitly:

```sh
QMS_INTEGRATION_TESTS=1 pnpm test:integration
```

Tests cover Argon2id, token hashing, domain RBAC denial, strict input contracts, organization/site isolation, assignment validation, task transitions, generic target registration, graph determinism, immutable published versions, version-bound active executions, concurrent completion, atomic cancellation, cookie/logout/expiration behavior and storage finalization/download boundaries.

## Browser smoke test

1. Open localhost:3000; verify API/database connectivity and logged-out state.
2. Sign in using the seed credentials. Inspect the HTTP-only cookie in browser tools, not application JavaScript.
3. Inspect user/membership and granted permissions. Complete the seeded WORKFLOW task and confirm exactly one next task appears.
4. Complete the next task and inspect the instance through the API: COMPLETED, same version, timestamped execution steps.
5. Create and complete an ACTION task with no workflow links.
6. Use the OpenAPI reference through localhost:3000/api/docs to create a definition/version/steps/transitions, publish it and start a new instance.
7. Request a file upload URL, PUT exact bytes and returned headers directly to MinIO, finalize, then download using the short-lived URL.
8. Verify foreign tenant IDs cannot be read or acted on and logout invalidates the session.

## CI and dependency locking

GitHub Actions installs dependencies, generates Prisma, starts PostgreSQL/MinIO, migrates and seeds, lints, typechecks, runs unit/integration suites and builds both applications. The resolved lockfile is uploaded as an artifact during initial bootstrapping. Before merging, commit the generated pnpm-lock.yaml and require frozen-lockfile installation in CI. Do not fabricate lockfile integrity values without package-manager resolution.

The authoring environment cannot install packages or start Docker. Only actual CI/local execution counts as verification. The draft PR must remain unmerged if checks fail or browser/storage smoke tests are incomplete.
