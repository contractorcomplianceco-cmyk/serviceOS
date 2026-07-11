# Phase 2 — Billing & Accounting

## Flow

1. A work order becomes billable only after closeout approval moves it to
   `Ready for Billing` / `Ready for Invoice` (see
   `PHASE_2_WORKFLOWS_AND_STATE_TRANSITIONS.md`).
2. **Invoicing** (`POST /api/invoices`, `requireStaff` + `canManageBilling`) — an
   invoice can only be created from a work order in the billable state; otherwise
   the request is rejected with the current status.
3. **Payments** (`POST /api/payments`, `requireStaff` + `canRecordPayment`) —
   records partial, credit, or refund payments against an invoice. Tables:
   `invoices`, `payments`.
4. **AR** — invoice balance reflects total minus amounts paid; aging/AR views read
   from persisted invoices.

## Calculation invariant

For any invoice, **`balance == total − amountPaid`**. This is asserted in
`src/__tests__/workflow.test.ts` across all invoices returned by `GET /api/invoices`
(guarded on the fields being present), so payment math stays internally consistent.

## Authorization

- Creating invoices requires billing-management authority (`canManageBilling`).
- Recording payments requires `canRecordPayment`. A Scheduler (no billing access)
  is rejected with `403` — verified in `src/__tests__/security.test.ts`.

## Guardrails

Nothing posts to accounting automatically. Invoices and payments are explicit staff
actions gated by role, and each writes an audit event.

## Notes / limitations (honest)

- There is **no general ledger and no live QuickBooks Online sync.** The AR model
  (invoices, payments, aging, partial/credit/refund) is real and persisted, but
  double-entry accounting and QBO OAuth/sync are future work (requirements R21,
  R29).
- Tax handling is basic (a tax code field); a full tax engine and PDF invoice
  export are not implemented.
- **Do not represent this as accounting-ready.** See
  `PHASE_2_PRODUCTION_READINESS.md`.
