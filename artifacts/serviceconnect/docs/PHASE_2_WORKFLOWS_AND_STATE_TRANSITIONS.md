# Phase 2 — Workflows & State Transitions

## Closeout approval (the core HITL guardrail)

State: `Pending Review` → `Approved` (or `Sent Back`).

1. A technician submits a VoiceConnect draft (`POST /api/closeouts`). Ownership is
   set from the session; the AI draft is snapshotted into an immutable `original`.
   Status starts at **`Pending Review`** — never auto-approved.
2. The technician may edit the draft (`PATCH /api/closeouts/:id`) only while it is
   `Pending Review` or `Sent Back`, and only their own draft. The `original`
   snapshot is never mutated.
3. An approver (`Administrator | Service Manager | Supervisor`) either:
   - **Approves** (`POST /api/closeouts/:id/approve`) — inside a DB transaction:
     posts a labor entry, maps detected materials to inventory, deducts stock via
     the inventory ledger (negative-stock protected, **no auto-override**), moves
     the work order to `Ready for Billing` / `Ready for Invoice`, and sets the
     closeout to `Approved`. Writes audit events.
   - **Sends back** (`POST /api/closeouts/:id/send-back`) — returns to the
     technician (`Sent Back`) with a reason.

### Idempotency

Approval is **idempotent**. The transaction re-reads the row `FOR UPDATE` and only a
`Pending Review` closeout advances; a repeat approve is a no-op that returns the
already-approved row unchanged. This guarantees labor/materials post exactly once
and inventory is deducted exactly once, even if the approve call is retried.

Verified by `src/__tests__/closeouts.test.ts`:
- A submitted closeout starts `Pending Review` (not auto-approved).
- Non-approver (technician) approve → `403`.
- Service Manager approve → `Approved`, `reviewedBy` set.
- **Repeat approve → same `reviewedAt`, and the work order carries exactly one
  labor entry** (no double-posting).
- **A closeout with a detected material, approved twice → total inventory on-hand
  drops by exactly one unit and exactly one `Consumed` audit event is written**
  (inventory is deducted exactly once, not per approval).
- Send-back after approval → `409` (locked).

## Work-order lifecycle

Created (`New`) → scheduled (scheduling authority required — `canSchedule`; RoseOS
never auto-schedules) → in progress (technician check-in/out) → `Completed Pending
Review` → on closeout approval `Ready for Billing` → invoiced. Creating a work
order already in a scheduled state requires scheduling authority (same guard as the
scheduling PATCH).

## Migration batch lifecycle

`Draft` → `Validated` (dry run) → `Importing` → `Imported` / `Failed`, with
`RolledBack` available after import. Detailed in `PHASE_2_DATA_MIGRATION.md`.

## Billing / AR

Work order must be in the billable state before an invoice can be created;
payments (partial/credit/refund) reduce the invoice balance. See
`PHASE_2_BILLING_AND_ACCOUNTING.md`.

## Guardrail summary

Nothing in these workflows sends to a customer, posts to accounting, or deducts
inventory without an explicit human action by an authorized role. Every transition
that changes financial or inventory state writes an audit event.
