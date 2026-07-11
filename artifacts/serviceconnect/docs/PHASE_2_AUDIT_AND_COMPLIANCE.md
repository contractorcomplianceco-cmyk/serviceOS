# Phase 2 — Audit & Compliance

## Model

Every mutation that changes meaningful state writes an **audit event** to the
`audit_log` table via `writeAudit()` (`lib/audit.ts`). Events are tenant-scoped and
capture: actor user id + name, action, entity type, entity id, a human summary, and
the request IP.

Audit events are append-only from the application's perspective — routes write them,
nothing rewrites them.

## Where audit events are written (examples)

- **Closeouts** — `Submitted`, `Edited`, `Approved`, `Sent Back`; plus `Consumed`
  (Inventory) for each material deducted on approval.
- **Migration** — `Created`, `Imported` (queued), `Deleted`, rollback.
- **Work orders, payments, inventory adjustments, customers/locations** — created /
  updated / state-changed actions.

## Reading the log

`GET /api/audit` — restricted to `Administrator | Service Manager | Supervisor`.
Supports `entityType`, `action`, and `limit` query filters. The frontend surfaces
audit history in Settings and a per-work-order activity tab.

## Test coverage

- `src/__tests__/security.test.ts` — technician blocked from `/api/audit` (`403`);
  Service Manager allowed (`200`).
- `src/__tests__/workflow.test.ts` — after creating a migration batch, the audit log
  (filtered by `entityType=MigrationBatch`) contains a `Created` event for that
  batch id, proving audit is written on mutation.
- `src/__tests__/closeouts.test.ts` — approval writes `Approved` (and inventory
  `Consumed`) events as part of the transaction.

## Notes / limitations

The audit trail is application-enforced and stored in the same database as the data
it describes. A tamper-evident/immutable store (append-only, checksummed, or shipped
to a separate WORM system) is future work for regulated-grade compliance. See
`PHASE_2_PRODUCTION_READINESS.md`.
