# Phase 2 — Customer Portal

## Model

The customer portal is a **customer-scoped** surface. A portal user is linked to a
single customer via `req.user.customerId` (resolved from the session), and every
portal route filters by both `tenantId` **and** that `customerId`. Portal users can
never reach internal staff routes, and staff can never reach portal-only routes.

The seeded portal user (`u14`) is linked to customer `c1`.

## Routes (`/api/portal/*`, all `requirePortalUser`)

- `GET /api/portal/me` — the portal user's own profile (returns `customerId`).
- `PATCH /api/portal/profile` — update contact/profile fields.
- `GET /api/portal/dashboard` — customer-scoped summary.
- `GET /api/portal/work-orders`, `GET /api/portal/work-orders/:id` — the customer's
  work orders only.
- `GET /api/portal/requests`, `POST /api/portal/requests` — service requests.
- `GET /api/portal/quotes`, `POST /api/portal/quotes/:id/decide` — quote
  approve/decline (a human customer decision, never automated).
- `GET /api/portal/invoices` — the customer's invoices.

## Guardrails

- `requirePortalUser` blocks any staff role; `requireStaff` on internal routes
  blocks portal users. The two audiences are mutually exclusive.
- All portal reads/writes are constrained to the linked `customerId` — a portal
  user cannot enumerate or address another customer's data.
- Quote decisions and service requests are explicit customer actions; the portal
  never auto-approves or auto-submits on the customer's behalf.

## Test coverage

`src/__tests__/security.test.ts`:
- Portal user → `GET /api/customers` returns `403` (staff route blocked).
- Portal user → `GET /api/portal/me` returns `200` with `customerId === "c1"`.
- Staff (admin) → `GET /api/portal/me` returns `403` (portal route blocked).

## Notes / limitations

The portal is scoped and guarded at the API level. A full external, branded,
self-service customer web experience (registration, notifications, payment
capture) is future work — see the requirements matrix (R13) and
`PHASE_2_PRODUCTION_READINESS.md`.
