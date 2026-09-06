# Deployment

## Render deployment

The repository includes `render.yaml` for the NestJS API plus managed PostgreSQL. Create/sync the Blueprint from the foundation branch, then set these Dashboard values before the first deploy:

- `APP_ORIGIN`: the exact public origin of the Next.js web app, including `https://`, with no trailing slash.
- `S3_ENDPOINT`: leave blank for AWS S3; use the provider endpoint for Cloudflare R2, Backblaze, Wasabi, or another S3-compatible provider.
- `S3_REGION`: the provider region, or `auto` where supported.
- `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`: private bucket credentials with only the required bucket permissions.

Render runs `pnpm db:deploy` as the pre-deploy command, before `node apps/api/dist/main.js`. Do not run `db:seed` in production. The health check is `/api/health/ready`. Render's `PORT` is injected by the platform; the Blueprint sets a compatible default.

If you are deploying from the existing service, redeploy the branch after the local Zod pipe fix. The crash was caused by `nestjs-zod` importing a private `@nestjs/swagger` deep path that newer Swagger package exports block. The API now validates the same shared Zod schemas without that runtime patch.
