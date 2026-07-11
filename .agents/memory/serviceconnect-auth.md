---
name: ServiceConnect auth architecture
description: How custom email/password auth is wired into the ServiceConnect frontend and where dev-only surfaces live.
---

# ServiceConnect auth (Phase 2)

Backend-powered custom email/password auth replaced the old localStorage-only prototype. Server lives in `artifacts/api-server` (Argon2id, server-side sessions via HTTP-only SameSite cookies, lockout/throttling). Frontend integration lives in `artifacts/serviceconnect`.

## Provider ordering (do not reorder)
`QueryClientProvider -> AuthProvider -> TooltipProvider -> WouterRouter -> AuthedApp -> AppProvider(store) -> AppLayout -> Router`.
**Why:** `store.tsx` calls `useAuth()`, so `AuthProvider` MUST be an ancestor of `AppProvider`. `AuthProvider` uses react-query hooks, so it must be under `QueryClientProvider`.
**How to apply:** any new top-level provider that needs auth goes below AuthProvider; anything the store needs goes above AppProvider.

## Auth gate (in App.tsx)
- `AuthedApp` shows `FullScreenLoader` while `useAuth().isLoading`.
- `RootRedirect` (`/`) → `/login` if no user, else `roleHome(user.role)`.
- `LoginRoute` (`/login`) → redirects an already-authenticated user to `roleHome(user.role)`; otherwise renders `Login`. Both redirect-away-from-login AND redirect-into-login must exist — the login route being unguarded was a real bug caught in review.
- All operational routes are wrapped in `Protected` (route-level authz, not just nav visibility).

## Dev-only surfaces — gated by `IS_DEV` (`import.meta.env.DEV`)
`IS_DEV` is exported from `src/lib/auth.tsx`. Gated behind it: Header "Demo Role" selector, Settings "Switch Role Context" block, Login "Dev Role Quick-Select". Server also 403s the dev-login/dev-users endpoints in prod, and store `setCurrentUserId` no-ops (calls `auth.devLogin`) outside dev. Keep all four layers in sync.
**Why:** the demo role switcher must never leak into production builds.

## Logout
Header, Settings, and TechnicianMobile all call the shared `logout()` from `useAuth()` (revokes session + clears cached `/me`) then `navigate("/login")`. Do not reintroduce the old `setCurrentUserId("u1")` fake logout.

## Client lib note
`ApiError`/`ResponseParseError` are re-exported from `@workspace/api-client-react` (index.ts) for error narrowing in `auth.tsx`. Generated react-query hooks require an explicit `queryKey` in `query` options — pass `getGetCurrentUserQueryKey()` / `getListDevUsersQueryKey()`. Rebuild libs (`pnpm run typecheck:libs`) after editing the client lib index before the frontend typecheck sees new exports.

## Seed
`artifacts/api-server/src/scripts/seed.ts` (`pnpm --filter @workspace/api-server run seed`). Tenant `org1`, 14 users u1–u14, idempotent (onConflictDoNothing). Demo password comes from the `DEMO_PASSWORD` env var (default is a dev-only constant in the seed script — do NOT record its value here). u1–u10 keep original ids/testids; u14 is a customer-portal user scoped to customerId=c1. The seed must not log the password value.
