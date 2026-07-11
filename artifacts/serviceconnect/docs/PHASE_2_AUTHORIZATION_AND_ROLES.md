# Phase 2 — Authorization & Roles

## Source of truth

`artifacts/api-server/src/lib/authz.ts` defines:

- `ROLE_NAV` — which nav sections each role may access.
- `canX` helpers — `canApproveCloseouts`, `canManageMigration`, `canRunJobs`,
  `canRecordPayment`, `canManageBilling`, `canSchedule`, `isFieldRole`,
  `isValidRole`, etc.

The frontend mirrors this in `src/lib/permissions.ts` (`canAccess`, `navFor`,
`canApproveCloseouts`, `isFieldRole`, `canManageMigration`, …). **Authorization is
enforced on both layers** — the frontend hides/guards UI, the server rejects
unauthorized requests regardless of UI state.

## The 12 roles

Administrator, Scheduler, Service Manager, Technician, Lead Technician, Billing,
Bookkeeper, Subcontractor, Supervisor, Inventory Manager, Sales, and the Customer
Portal user. (Phase 1 described 8 staff roles from the header switcher; Phase 2's
authz layer enumerates the full 12 including portal + specialized back-office
roles.)

## Enforcement middleware

- `requireAuth` — must run first; attaches `req.user`.
- `requireRoles(...roles)` — explicit allow-list (e.g. closeout approve is
  `Administrator | Service Manager | Supervisor`).
- `requireNav(section)` — checks `ROLE_NAV` (e.g. `/work-orders` needs the
  `work-orders` nav).
- `requireStaff` — any internal staff role (blocks portal users).
- `requirePortalUser` — portal users only (blocks staff).

Some routes add an inner `canX` check for finer control (e.g. payments require
`requireStaff` **and** `canRecordPayment`; invoices require `canManageBilling`).

## Key guarded surfaces

| Route | Guard |
|---|---|
| `/api/audit` | `requireRoles(Administrator, Service Manager, Supervisor)` |
| `/api/migration/*` | admin-only (`canManageMigration`) |
| `/api/jobs` (POST) | admin-only (`canRunJobs`) |
| `/api/payments` (POST) | `requireStaff` + `canRecordPayment` |
| `/api/closeouts/:id/approve` | `requireRoles(Administrator, Service Manager, Supervisor)` |
| `/api/portal/*` | `requirePortalUser` |
| `/api/customers` | `requireNav("customers")` (portal blocked) |

## Frontend route guards

`App.tsx` wraps routes in `<Protected allow={...}>`. Direct URL access is blocked,
not just nav visibility — e.g. `/settings/migration` is `allow={canManageMigration}`
and `/review` is approver-only. A technician navigating directly to an admin route
is redirected.

## Test coverage

`src/__tests__/security.test.ts`:

- Technician blocked from `/api/audit` (`403`); Service Manager allowed (`200`).
- Service Manager blocked from `/api/migration/batches` (`403`); Administrator
  allowed (`200`).
- Service Manager blocked from enqueuing jobs (`403`).
- Scheduler (no billing access) blocked from recording payments (`403`).
- Portal user blocked from `/api/customers` (`403`); staff blocked from
  `/api/portal/me` (`403`).
