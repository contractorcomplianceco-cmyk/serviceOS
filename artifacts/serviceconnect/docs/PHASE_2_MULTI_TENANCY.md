# Phase 2 — Multi-Tenancy

## Model

Every domain table carries a `tenantId` column, and **every query filters by
`req.user.tenantId`.** Tenancy is resolved from the authenticated session, never
from client input, so a user can only ever read or mutate rows inside their own
tenant.

Reads use `eq(table.tenantId, user.tenantId)`; single-row fetches combine it with
the row id (`and(eq(table.id, id), eq(table.tenantId, user.tenantId))`), so a
cross-tenant id lookup returns "not found" rather than leaking the row. Inserts set
`tenantId` from the session; ownership fields (e.g. a closeout's `technicianId`) are
also taken from the session, never trusted from the body.

## Isolation guarantees

- A tenant's list endpoints return only that tenant's rows.
- Fetching another tenant's record by id yields `404` (or `403`), never the row.
- A newly created tenant starts empty — no seed-tenant data bleeds in.

## Test coverage

`src/__tests__/security.test.ts` proves isolation using a **second, freshly
inserted tenant**:

- The test helper `createSecondTenant()` inserts a new tenant plus an active admin
  user directly via `@workspace/db`.
- Logged in as that second-tenant admin, `GET /api/customers` returns `200` with an
  **empty array** — none of the seed tenant's customers appear.
- `GET /api/customers/c1` (a seed-tenant customer) returns `403`/`404` for the
  second tenant.

Because the tests share one dev database, they never assert exact seed counts;
they assert isolation invariants (empty list for a fresh tenant, no cross-tenant
row access) that hold regardless of concurrent seed data.

## Notes / limitations

- Isolation is enforced in application code (query filters), not (yet) by Postgres
  row-level security. A missing `tenantId` filter on a future route would be a
  cross-tenant leak — new routes must always scope by tenant. This is the single
  most important review check for any new endpoint.
