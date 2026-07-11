---
name: ServiceConnect billing / AR invariant
description: How the invoice balance invariant is kept correct in the payments route.
---

# AR balance invariant is server-enforced, not just asserted

The invoice invariant is `balance = amount - amountPaid >= 0`. This must be
**enforced in `POST /api/payments`**, not only asserted over seeded data in tests.

- Non-refund payments (`Payment`/`Partial Payment`/`Credit`) are rejected with 400
  when `amount > remaining balance`.
- Refunds are rejected with 400 when `amount > amountPaid`.
- Validation runs after the `for("update")` invoice lock but **before** any insert/
  update, so a rejected request causes no state change and writes no audit event.
- Boundary: exact-balance payment and exact-`amountPaid` refund are allowed (`>` not
  `>=`, with a tiny float EPS).
- Status transitions: paying to full flips status to `Paid`; a refund that drops a
  `Paid` invoice below full reverts it to `Invoiced` and clears `paidDate`.

**Why:** a test that only checks seeded invoices passes even when the route allows
overpayment — the invariant held for the seed but was not guaranteed. Overpayment
is not a supported flow; enforce it at the write path.

**How to apply:** any new money-movement path (credits, adjustments, write-offs)
must apply the same bound + self-reversing tests (overpay/over-refund → 400, no
state change).
