---
name: ServiceConnect backend invariants
description: Durable guardrails for the ServiceConnect api-server (inventory ledger, HITL, hybrid frontend store) — the rules code alone doesn't make obvious.
---

# ServiceConnect backend invariants

## Inventory is an immutable ledger
- On-hand / reserved / available / per-location balances are ALWAYS derived by folding `inventory_transactions`; nothing writes a balance column directly.
- **Why:** auditability + correctness — a single source of truth prevents drift between a stored balance and its history.
- **How to apply:** any new inventory operation must post transaction rows, never UPDATE a quantity. The list endpoint recomputes balances on read, so the frontend invalidates both the inventory list key and the transactions key after every ledger mutation.

## Negative-stock guard is directional
- The guard only blocks a location leg when it DECREASES on-hand there (onHandDelta<0) or INCREASES reserved there. A purely additive leg (a receipt, or the incoming side of a transfer) never trips it.
- **Why:** a naive "any leg would be negative" check wrongly blocked valid receipts / incoming transfers into a zero-stock location.
- **How to apply:** when adding new transaction types, classify each leg by its signed delta before applying the guard. A privileged `override` flag (Administrator / Inventory Manager) bypasses the guard and is itself audited.

## Human-in-the-loop is enforced server-side
- RoseOS never auto-commits. Purchase requests go Requested → Approved → Received; receiving is the ONLY step that posts stock into the ledger. Document extraction is simulated but persisted as a draft requiring human approval.
- **Why:** the whole product thesis is guardrailed AI. Approval/authz lives in the backend, not just hidden UI.

## Frontend store is a hybrid (backend + local)
- The operational spine is served from the backend via generated React Query hooks; invoices/payments + AI recommendations stay local. When moving a slice from local to backend, remove it from the local state shape AND add a list query.
- **Generated LIST response types are inline/unnamed and widen enums to `string`**, so the store casts them `as unknown as <DomainType>[]`. Mutation BODY types ARE named — import those from the api-client barrel.
- **The backend does NOT compute derived display-only fields the old mock carried** (e.g. document compliance status Valid/Expiring/Expired). If a page filters/styles on such a field, compute it in the store during the cast, or the page silently shows everything as one bucket. **Why:** a purely additive backend serializer will typecheck fine (the cast hides the missing field) but break UI filtering at runtime.
