# Deployment

## Independent applications, one public origin

- Web: Vercel, workspace root install, build `pnpm --filter @qms/web... build`, application root apps/web. Include shared workspace packages in the build.
- API: long-running Node.js 22 process/container, not Vercel functions. Build with `pnpm db:generate && pnpm exec turbo build --filter=@qms/api`; run `node apps/api/dist/main.js`.
- PostgreSQL: managed database with backups and a separate migration identity.
- Storage: private AWS S3 or compatible service, encryption and public-access blocking.

Set API_INTERNAL_URL in the web deployment before building; it is server/build configuration, not NEXT_PUBLIC data. Set APP_ORIGIN on the API to the one external HTTPS origin. The Next.js rewrite retains `/api` in the backend path. Ensure the edge forwards Origin and Set-Cookie without rewriting the cookie domain. Do not cache authenticated API responses. For an external reverse proxy, route `/api/*` directly to NestJS and `/qms/*` to Next.js with the same origin semantics.

Production API requires NODE_ENV=production, DATABASE_URL, APP_ORIGIN, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, optional S3_ENDPOINT, and bounded SESSION_TTL_SECONDS. Use managed secret injection, never committed environment files. Seed data is forbidden in production. Production disables public Swagger routes; generate/restrict API documentation separately for operators.

## Release procedure

1. Verify lint, types, tests and both builds from the committed lockfile.
2. Back up PostgreSQL and review migration/trigger changes.
3. Run `pnpm db:deploy` once under migration credentials before rolling out the new API.
4. Deploy the API, wait for `/api/health/ready`, then deploy the frontend with correct backend routing.
5. Complete same-origin login, tenant denial, workflow/task and signed-upload smoke tests.
6. Monitor errors, database connections, storage failures and authorization denials.

`docker/api.Dockerfile` is a portable baseline image. It builds the API separately from Next.js. It currently retains workspace dependencies for reliable Prisma engine resolution; use a tested production-only dependency deployment strategy before optimizing image size, rather than deleting required generated engines.

## Production hardening outside this foundation

Shared/distributed rate limiting for multiple API replicas; explicitly trusted proxy topology; secret rotation and storage IAM design; malware scanning and quarantine policies; abandoned upload/session cleanup; least-privilege runtime database roles; structured redacted telemetry; incident response, restore drills, retention policy and security review. API input limits are 256 KiB; object bytes bypass the API. File download URLs remain usable until their short expiration, even after logout.

This is a platform foundation, not regulatory compliance certification. Parallel workflow execution, electronic signatures, notification delivery and QMS business functions are not implemented.
