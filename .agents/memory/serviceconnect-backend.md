---
name: ServiceConnect backend migration
description: Durable decisions & guardrail invariants for the ServiceConnect operational-data backend (localStorage→Postgres). Retrieval-oriented, not a changelog.
---

# ServiceConnect operational-data backend

## Store facade boundary
- The store keeps the `useAppStore()` interface but is a react-query facade over the API; pages are unchanged. Generated API types differ from frontend domain types (string enums, `X|null`, `tenantId`) and are bridged with `as unknown as` casts — this cast boundary is intentional, do not try to unify the two type worlds.
- Not everything is on the backend: a local-only localStorage slice still holds invoices/billing, equipment, documents, and RoseOS recommendations (deferred to a follow-up). Treat "is this entity backed by the API or by localStorage?" as a real question when touching the store.
- Create actions that need a server-assigned id return a Promise resolving to the entity/id (or null); callers must `await` before navigating.

## Backend guardrails (acceptance invariants — keep enforced)
**Why:** the task requires backend authz, org1 tenant scoping, idempotency, human-in-the-loop, and audit on *every* mutation. These are subtle and easy to regress — the recurring failure modes below are the ones to watch.
**How to apply** when touching any operational route:
- Ownership/identity comes from the session user, never from the request body.
- Closeout reads are gated to approvers (full tenant queue) and field roles (own drafts only); every other role gets 403. Don't fall back to "any authenticated user can read."
- Editable-state guards matter: an approved closeout is locked — it can't be edited AND can't be sent back (only a Pending Review draft can be sent back). Guard both endpoints, not just edit.
- Scheduling requires scheduling authority on **both** create and update — any field that touches scheduling (status→Scheduled, schedule window, time window) must be gated on *every* endpoint that can set it. Guarding only PATCH leaves POST as a bypass.
- **Every** related-entity lookup inside convert/approve transactions must include a tenant predicate — even inside idempotency short-circuit branches and even when the parent row is already tenant-scoped. This is the single most-missed spot.
- Idempotency: intake→work-order conversion and closeout approval must be safe to call twice (same work order returned; inventory deducted exactly once). Use a row lock + status gate inside the transaction.
- Every mutation writes an audit event. For broad update endpoints, audit *any* field change with a generic fallback summary, not only "interesting" fields.

## Seeding
- Operational seed data is duplicated from the frontend mock-data because artifacts can't cross-import — the two will drift unless kept in sync deliberately.
- Closeouts keep an immutable `original` snapshot (the AI draft at submission) distinct from the mutable/edited fields; the serializer omits `original` from API responses because the frontend doesn't consume it.
- Column-type gotcha: timestamp columns want `Date`; date-only columns want `YYYY-MM-DD` strings; jsonb date fields keep full ISO strings. Inserts use conflict-do-nothing so re-seeding is safe.
