---
name: ServiceConnect store invariants
description: Durable rules for mutating the ServiceConnect React-context store (artifacts/serviceconnect/src/lib/store.tsx) safely.
---

# ServiceConnect store mutation invariants

Rules learned while wiring the operational spine + fixing a code-review pass.

## Read from the setState updater snapshot, not the outer render `state`
Actions must compute lookups/derived values (e.g. next WO sequence, customer/location match) inside
the `setState((s) => …)` updater using `s`, never the captured outer `state`.
**Why:** the outer `state` is a stale render snapshot; rapid repeated actions (double-clicks, batched
calls) compute against stale data → duplicate sequence numbers / conversion races. A cheap early-out
guard against the outer `state` is fine, but the real work belongs in the updater.

## Status-changing actions must be idempotent, and the guard must match the UI filter
`approveCloseout` no-ops unless `closeout.status === 'Pending Review'`.
**Why:** without a guard, re-invoking it re-posts labor/materials and re-deducts inventory
(double-posting). **How to apply:** the store guard and the page's "approvable" filter must stay in
lockstep — `SupervisorReview.tsx` shows approve only for `status === 'Pending Review'`. If you change
one, change the other, or the button silently no-ops. Note there are several look-alike statuses
(`Completed Pending Review`, `Awaiting Quote Approval`) that are NOT approvable.

## Payment math: recompute status from amountPaid every mutation; clamp to [0, amount]
`recordPayment` clamps `amountPaid` to `[0, invoice.amount]` and recomputes status each call
(fullyPaid → `Paid`; else if it was `Paid`, revert to `Invoiced`).
**Why:** a refund on a `Paid` invoice must revert it; over-refunds must not drive paid negative;
overpayments must not exceed the total. Invoice status uses the `BillingStatus` union (there is no
separate InvoiceStatus type).

## Bump the localStorage key when adding persisted fields
Adding persisted slices/fields requires bumping the key (currently `serviceconnect_data_v3`) so
existing browsers re-seed instead of hydrating a stale shape. Keep the key value in `replit.md` in sync.
