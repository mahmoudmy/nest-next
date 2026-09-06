# Deployment

## Vercel deployment

The repository includes `vercel.json` for a root-linked Vercel project. It explicitly selects the Next.js framework, installs from the frozen workspace lockfile, builds only `@qms/web`, and points Vercel at `apps/web/.next`. Set the Vercel project Root Directory to `.` if using this file. Alternatively set Root Directory to `apps/web`, remove the root build/output overrides, and use `pnpm --filter @qms/web build` only if your Vercel workspace setup preserves the monorepo packages.

Set `API_INTERNAL_URL` to the public NestJS API origin, for example `https://qms-api.onrender.com`. Do not use `localhost`, `NEXT_PUBLIC_*`, or a browser-visible API URL. The Next.js rewrite keeps browser requests on `/api/*` and forwards them server-side to NestJS. Set `APP_ORIGIN` on the API to the exact Vercel production domain, including `https://` and no trailing slash. Add preview origins separately if preview deployments need authentication, or use a dedicated staging Vercel project. Do not cache authenticated `/api/*` responses.

Vercel may use a newer Node 22/24 runtime than the API. The workspace accepts Node >=22 <25; the API remains a long-running Node service on Render and does not become a Vercel function.

## Render deployment

The repository includes `render.yaml` for the NestJS API plus managed PostgreSQL. Create/sync the Blueprint from the foundation branch, then set these Dashboard values before the first deploy:

- `APP_ORIGIN`: the exact public origin of the Next.js web app, including `https://`, with no trailing slash.
- `S3_ENDPOINT`: leave blank for AWS S3; use the provider endpoint for Cloudflare R2, Backblaze, Wasabi, or another S3-compatible provider.
- `S3_REGION`: the provider region, or `auto` where supported.
- `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`: private bucket credentials with only the required bucket permissions.

Render runs `pnpm db:deploy` as the pre-deploy command, before `node apps/api/dist/main.js`. Do not run `db:seed` in production. The health check is `/api/health/ready`. Render's `PORT` is injected by the platform; the Blueprint sets a compatible default.

If you are deploying from the existing manually-created Render service instead of the Blueprint, set the build command to `pnpm install --frozen-lockfile && pnpm db:generate && pnpm exec turbo build --filter=@qms/api`, the pre-deploy command to `pnpm db:deploy`, the start command to `node apps/api/dist/main.js`, and the health path to `/api/health/ready`.

## Independent applications, one public origin

- Web: Vercel, workspace root install, build `pnpm --filter @qms/web... build`, application root apps/web. Include shared workspace packages in the build.
- API: long-running Node.js 22 process/container, not Vercel functions. Build with `pnpm db:generate && pnpm exec turbo build --filter=@qms/api`; run `node apps/api/dist/main.js`.
- PostgreSQL: managed database with backups and a separate migration identity.
- Storage: private AWS S3 or compatible service, encryption and public-access blocking.
