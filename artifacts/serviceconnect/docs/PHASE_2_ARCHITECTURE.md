# Phase 2 — Architecture

## Components

```
┌────────────────────────────┐        ┌────────────────────────────┐
│ serviceconnect (React/Vite)│  HTTPS │ api-server (Express)        │
│  - TanStack React Query    │ ─────► │  - /api/* routers           │
│  - wouter routing          │  /api  │  - requireAuth / RBAC       │
│  - role-gated UI           │ ◄───── │  - Zod validation           │
└────────────────────────────┘  JSON  │  - background job poller    │
                                       └─────────────┬──────────────┘
                                                     │ Drizzle ORM
                                                     ▼
                                           ┌──────────────────┐
                                           │ PostgreSQL        │
                                           │  ~40 tables       │
                                           │  tenant-scoped    │
                                           └──────────────────┘
```

## Contract-first

The API surface is defined in OpenAPI (`lib/api-spec`) and code-generated into Zod
schemas (`@workspace/api-zod`) and typed React Query hooks
(`@workspace/api-client-react`). The server validates request bodies/params with the
generated Zod schemas; the client calls the generated hooks. Regenerate with:

```
pnpm --filter @workspace/api-spec run codegen
```

Do **not** change the OpenAPI `info.title` — it controls generated filenames.

## Server layout (`artifacts/api-server/src`)

- `app.ts` — builds the Express app (middleware, routers) and exports it. `index.ts`
  bootstraps the HTTP server and the background job poller.
- `routes/*` — one router per domain. Each route is `requireAuth` first, then a
  role/nav guard, then Zod validation, then a tenant-scoped Drizzle query.
- `middleware/auth.ts` — `requireAuth`, `requireRoles`, `requireNav`,
  `requireStaff`, `requirePortalUser`.
- `lib/authz.ts` — the authorization source of truth: `ROLE_NAV` map and the
  `canX` helpers (12 roles).
- `lib/audit.ts` — `writeAudit()` appends immutable audit events.
- `lib/migration/engine.ts` — CSV parse, mapping guess, dry-run validation, import.
- `lib/inventory-ledger.ts` — stock transactions with negative-stock protection.
- `lib/auth/session.ts` — session token issue/lookup/revoke.

## Data layer (`lib/db`)

Drizzle schema in `lib/db/src/schema/*`. Every domain table has a `tenantId`
column. Schema changes are applied with push-based migrations (see the
`pnpm-workspace` db reference). Types (`Customer`, `WorkOrder`, `Closeout`, …) are
exported from `@workspace/db` and reused across server and tests.

## Frontend integration

`src/lib/store.tsx` still exposes `useAppStore()` to pages, but its actions now call
React Query mutations against the API (e.g. `approveCloseout` → `useApproveCloseout`).
A `QueryClient` caches reads. Route guards (`Protected` in `App.tsx`) and the
permission helpers in `src/lib/permissions.ts` remain the frontend enforcement
layer, mirrored server-side.

## Routing in the Replit workspace

A shared reverse proxy routes by path. The API server owns `/api`; the web app owns
`/`. Ad-hoc requests go through `localhost:80/api/...` (never the service port
directly). See the `pnpm-workspace` skill for details.
