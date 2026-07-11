# Phase 2 — Authentication

## Model

Authentication is **cookie-based session tokens**, not JWTs in the client.

- On login the server issues a session token, stores it in the `sessions` table
  (tenant + user + expiry), and sets it as an HTTP cookie.
- `requireAuth` (in `middleware/auth.ts`) reads the cookie, resolves it via
  `getUserForToken()`, and attaches `req.user` (`{ id, tenantId, role, name, … }`).
  Missing/invalid/expired token → `401`.
- Logout (`POST /api/auth/logout`) revokes the session; `GET /api/auth/me` returns
  the current user or `401`.

Supporting tables: `sessions`, `login_attempts`, `password_reset_tokens`,
`invitations`.

## Dev login (demo user switching)

`POST /api/auth/dev-login` authenticates **any active user by id** and is the
mechanism behind the header/Settings user switcher in the demo. It (and
`GET /api/auth/dev-users`) is hard-gated to non-production via a **runtime** check
(`isProductionRuntime()` reads `NODE_ENV` on every request): when
`NODE_ENV=production` both return `403` and never set a session cookie.

Real authentication is `POST /api/auth/login` (email + password, argon2 hashing
with failed-attempt throttling/lockout), which issues the **same** cookie session
as dev-login. That is the production login path; MFA/SSO remain future
enhancements. See `PHASE_2_PRODUCTION_READINESS.md`.

## Test coverage

`src/__tests__/security.test.ts` verifies:

- Unauthenticated requests to protected routes return `401`.
- An authenticated user resolves via `/api/auth/me`, and logout clears the session
  (subsequent `/api/auth/me` → `401`).
- The `dev-login` backdoor is disabled in production: with `NODE_ENV=production`,
  `POST /api/auth/dev-login` and `GET /api/auth/dev-users` return `403` and set no
  cookie, while both remain usable outside production.

The test helper (`src/__tests__/helpers.ts`) logs in via `dev-login` and reuses the
returned session cookie through a Supertest agent, exactly as the browser would.

## Session cookie notes

- The cookie name is centralized (`SESSION_COOKIE_NAME`); do not hard-code it.
- In development the cookie is not `Secure` (no TLS on localhost); production must
  serve over HTTPS so the cookie can be `Secure`.
- `SESSION_SECRET` is provided as an environment secret and must be set in every
  environment.
