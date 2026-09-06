# Authentication

## Browser session lifecycle

`POST /api/auth/login` validates strict `{email,password}`, verifies an Argon2id hash (64 MiB memory, 3 iterations, parallelism 1), picks an active membership, and creates an expiring session. Missing accounts undergo a dummy password verification to reduce timing differences. Login failures return a generic response and never log submitted credentials.

The browser receives a 256-bit random token only in an HTTP-only, SameSite=Lax cookie. PostgreSQL stores its SHA-256 digest, never the raw token. Development uses `qms_session`; production uses `__Host-qms_session`, Secure, Path=/, no Domain attribute. `SESSION_TTL_SECONDS` defaults to eight hours and is bounded to 5 minutes through 24 hours. There is no token in localStorage, sessionStorage, URLs, or API JSON.

`GET /api/auth/session` returns the safe current-user fields, validated organization/site membership context, current permission names and memberships belonging to that user. Password hashes and session secrets are never serialized.

`POST /api/auth/logout` revokes the current session and clears its cookie. `POST /api/auth/context` accepts a membership selection, verifies ownership and active organization/site state, revokes the old session and rotates the token. Browser-provided membership IDs are selectors, not trusted context.

Every authenticated request rechecks session expiration/revocation, user activation/deletion, membership ownership and activation, and organization/site activation. Deactivating an eligible account revokes all of its sessions. To avoid cross-organization side effects, global account activation is restricted to organization-wide administrators and users whose memberships all belong to that same organization; self-deactivation is rejected.

## CSRF, CORS and abuse controls

All non-safe methods, including login, require `Origin` to exactly equal `APP_ORIGIN`. Secure cookies and SameSite are defense-in-depth, not the only CSRF mechanism. CLI clients must explicitly set that Origin header. CORS allows only the configured application origin, with credentials. Login is throttled to five attempts per minute; other routes default to 120 requests per minute.

The built-in limiter is process-local. Before horizontal scaling, configure a shared throttler store or enforced edge rate limits. Do not blindly trust `X-Forwarded-For`; configure only known reverse proxies if adopting IP-based edge identity. The current conservative backend limiter can group proxied users together.

## Identity-provider extension

`IdentityProvider` separates credential verification from session issuance. `LocalIdentityProvider` is the initial implementation. A future OIDC/SAML adapter must verify its provider protocol and map a verified subject to a local user; it must not bypass local membership checks. There is no unnecessary provider provisioning layer in this milestone.

## Production requirements

Use HTTPS, a single public application origin, environment-managed storage credentials, secret rotation, and explicit account provisioning. The development seed refuses production mode and never overwrites existing account credentials. Password reset, invitation delivery, MFA and full account administration are not included.
