# ServiceConnect with RoseOS Intelligence

A field-service operating system for a plumbing/HVAC service company — a modern
replacement for BlueFolder + QuickBooks. It covers intake, work orders, dispatch,
technicians, customers/locations, inventory, equipment, billing, accounting/AR,
documents/compliance, reports, a customer portal, and **RoseOS** — an AI layer that
drafts suggestions a human must approve. Human-in-the-loop guardrails are core:
RoseOS never auto-schedules, sends, or invoices.

## Project overview

- **Frontend** (`artifacts/serviceconnect`) — React 18 + TypeScript + Vite + Tailwind +
  shadcn/ui, routing via `wouter`. Role-based views plus a separate mobile technician
  shell (`/tech`) with VoiceConnect voice-closeout drafting and a customer portal
  (`/portal`).
- **Backend** (`artifacts/api-server`) — Express + TypeScript API with argon2 password
  hashing, cookie-based sessions, Zod-validated request/response contracts, and an
  object-storage abstraction (local filesystem or Replit App Storage / GCS).
- **Shared libraries** (`lib/*`) — `@workspace/db` (Drizzle schema + client),
  `@workspace/api-zod` (Zod schemas), `@workspace/api-client-react` (generated React
  Query hooks). The API contract is defined OpenAPI-first and helpers are generated
  from it.

### Role model

12 roles total: **11 internal roles** (Administrator, Service Manager, Scheduler,
Supervisor, Lead Technician, Technician, Billing, Bookkeeper, Inventory Manager,
Sales, Subcontractor) + **1 Customer Portal User**. The backend (`authz.ts` / DB
`ROLES`) is authoritative; the frontend mirrors it in `permissions.ts`.

## Repository structure

```text
.
├── artifacts/
│   ├── serviceconnect/     # React + Vite web app (frontend)
│   │   └── docs/           # requirements matrix, calendar audit, phase-2 docs
│   ├── api-server/         # Express API (backend) + vitest suite
│   └── mockup-sandbox/     # component preview server (design tooling)
├── lib/
│   ├── db/                 # Drizzle schema, client, migrations (push-based)
│   ├── api-zod/            # Zod schemas
│   └── api-client-react/   # generated React Query hooks
├── scripts/                # shared utility scripts (@workspace/scripts)
├── pnpm-workspace.yaml     # workspace packages, catalog pins
└── package.json            # root task orchestration
```

## Requirements

- **Node**: v20+ (developed on Node 24).
- **Package manager**: **pnpm** 10+ (this repo is a pnpm monorepo; npm/yarn are blocked).
- **PostgreSQL**: a reachable database (set `DATABASE_URL`).

## Installation

```bash
pnpm install
```

## Environment variables

Copy `.env.example` to `.env` and fill in values. Key variables:

| Variable                                                                               | Purpose                                                           |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`                                                                         | PostgreSQL connection string (API, migrations, seed).             |
| `SESSION_SECRET`                                                                       | Signs auth session tokens.                                        |
| `DEMO_PASSWORD`                                                                        | Password for demo accounts created by the seed.                   |
| `STORAGE_BACKEND`                                                                      | `local` (filesystem) or `object` (Replit App Storage / GCS).      |
| `LOCAL_STORAGE_DIR`                                                                    | Upload dir when `STORAGE_BACKEND=local`.                          |
| `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | Object-storage config when `STORAGE_BACKEND=object`.              |
| `PORT`, `BASE_PATH`, `NODE_ENV`, `LOG_LEVEL`                                           | Runtime/routing config (usually injected by the Replit workflow). |

## Database setup & migrations

Schema is managed with Drizzle in `lib/db` using a **push-based** workflow (no SQL
migration files):

```bash
# apply the current schema to the database in DATABASE_URL
pnpm --filter @workspace/db run push

# force-apply (destructive; use with care)
pnpm --filter @workspace/db run push-force
```

## Seed data

```bash
pnpm --filter @workspace/api-server run seed
```

This creates the authoritative users (all 12 roles), customers, locations, work
orders, inventory, and related demo data.

## Development

On Replit these run as workflows. Locally, run each service in its own terminal:

```bash
# API server (reads PORT, DATABASE_URL, SESSION_SECRET, ...)
pnpm --filter @workspace/api-server run dev

# Frontend web app (reads PORT, BASE_PATH)
BASE_PATH=/ PORT=5173 pnpm --filter @workspace/serviceconnect run dev
```

The frontend expects the API under the same origin at `/api` (via a reverse proxy on
Replit). When running locally, serve both behind a proxy that routes `/api` to the
API server, or adjust the API base accordingly.

## CORS allowlist (cross-origin frontends)

When the frontend is served from a **different origin** than the API (for example
the published Lovable app calling the Replit backend directly), the browser sends
credentialed cross-origin requests and requires CORS. The API answers those only
for origins on an explicit allowlist.

- The allowlist is read from the `SERVICECONNECT_ALLOWED_ORIGINS` environment
  variable — a comma-separated list of **exact** origins (`scheme://host[:port]`).
- Matching is exact set membership. There is **no** wildcard (`*`), no
  `*.lovable.app` subdomain globbing, and no substring/prefix matching, so a
  look-alike such as `https://connect-bridge-swift.lovable.app.evil.com` is
  rejected.
- Responses to allowed origins echo the exact `Access-Control-Allow-Origin` and
  set `Access-Control-Allow-Credentials: true`; disallowed origins get neither,
  so the browser blocks them.
- Whitespace around entries is trimmed and empty entries are ignored. An unset or
  empty value allows no cross-origin browser requests.

Example (published frontend plus local dev):

```
SERVICECONNECT_ALLOWED_ORIGINS=https://connect-bridge-swift.lovable.app,http://localhost:5173
```

**Setting it on Replit:** open the deployment's **Secrets** (Tools → Secrets, or
the Deployments → Configuration secrets for the published app), add a secret named
`SERVICECONNECT_ALLOWED_ORIGINS` with the comma-separated value above, then
**redeploy/republish** so the running server picks it up. Verify with a preflight:

```bash
curl -i -X OPTIONS \
  -H "Origin: https://connect-bridge-swift.lovable.app" \
  -H "Access-Control-Request-Method: POST" \
  https://construction-network-research.replit.app/api/auth/login
```

A correctly configured backend returns `204`/`200` with
`Access-Control-Allow-Origin: https://connect-bridge-swift.lovable.app` and
`Access-Control-Allow-Credentials: true`.

## Typecheck

```bash
pnpm run typecheck            # whole workspace (libs then artifacts)
pnpm --filter @workspace/serviceconnect run typecheck
pnpm --filter @workspace/api-server run typecheck
```

## Tests

```bash
pnpm --filter @workspace/api-server exec vitest run
```

The suite (auth/security, work-order workflow, closeouts) requires a reachable
`DATABASE_URL`.

## Production build

```bash
# API server → artifacts/api-server/dist/index.mjs
pnpm --filter @workspace/api-server run build

# Frontend → artifacts/serviceconnect/dist/public (static)
BASE_PATH=/ PORT=24052 pnpm --filter @workspace/serviceconnect run build
```

## Regenerating the API contract

```bash
pnpm --filter @workspace/api-spec run codegen
```

## Feature status

**Real (implemented end-to-end):**

- Auth (argon2 + sessions), role-based route gating (server + client).
- Work orders (trips/labor/materials/attachments), dispatch calendar, technicians,
  customers/locations, inventory, equipment, documents.
- Billing & accounts-receivable with enforced invariants (balance ≥ 0; overpayment
  and over-refund rejected at the API).
- Customer portal, recurring/contract work, object-storage-backed attachments.
- VoiceConnect closeout drafting → Supervisor Review approval flow.

**Simulated / sandbox-ready:**

- RoseOS AI recommendations and dispatch routing figures (match %, ETA, mileage) are
  mocked heuristics, not a live ML/routing engine.
- External intake sources (ServiceChannel / other portals) are represented in the data
  model but not connected to live third-party APIs.

**Planned / requires external credentials:**

- BlueFolder data-migration importer (see `artifacts/serviceconnect/docs/PHASE_2_*`).
- Live accounting sync (e.g. QuickBooks) and real routing/telematics providers.

## Known limitations

- The dispatch calendar tracks work orders only; non-work-order availability blocks
  are represented lightly (see the calendar audit).
- Some frontend demo seed (`src/lib/mock-data.ts`) is a fallback used before auth
  resolves; the API is the source of truth once authenticated.

## Documentation

- `artifacts/serviceconnect/docs/CALENDAR_REQUIREMENTS_AUDIT.md` — dispatch calendar
  requirement-by-requirement audit.
- `artifacts/serviceconnect/docs/SERVICECONNECT_REQUIREMENTS_MATRIX.md` — full feature matrix.
- `artifacts/serviceconnect/docs/PHASE_2_OVERVIEW.md`, `PHASE_2_DATA_MIGRATION.md` — phase-2 plans.
- `replit.md` — architecture decisions and conventions.
