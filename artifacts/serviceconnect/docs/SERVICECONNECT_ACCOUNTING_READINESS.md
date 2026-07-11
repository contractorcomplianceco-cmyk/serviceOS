# ServiceConnect — Accounting Readiness

Honest assessment of how close the app is to replacing QuickBooks. **Short answer: it is a working
Accounts-Receivable prototype, not an accounting system.** There is no general ledger.

## What works today (prototype functional, persisted)

- **Invoicing:** billing drafts → invoices with line items and amounts.
- **Payments:** `recordPayment` supports **Payment, Partial Payment, Credit, Refund** with method.
  - Tracks `Invoice.amountPaid` and remaining balance; auto-marks `Paid` when fully covered.
  - Refunds reduce the paid amount (rendered in red per color semantics).
  - **E2E-verified:** a $100 partial payment on INV-4980 updated Paid/Balance correctly.
- **AR aging:** Accounting shows Outstanding AR, Past Due, Collected (month), Open Invoices, and an
  aging chart (0–30 / 31–60 / 60+).
- **Collections focus:** per-invoice Paid / Balance and recorded-payment history.
- **Audit:** every payment writes an audit event.

## Scenario G walkthrough (Accounting readiness)

| Step | Status | Note |
|---|---|---|
| 1. Create invoice | ☑ | Billing flow |
| 2. Record partial payment | ✅ | E2E-verified |
| 3. Record full payment | ☑ | Flips status to Paid |
| 4. Create credit | ☑ | `Credit` payment type |
| 5. Create refund | ☑ | `Refund` reduces paid |
| 6. Confirm customer balance | ☑/⚠ | Invoice balances tracked; customer-level rollup is shallow |
| 7. Confirm GL impact | ✖ | **No general ledger exists** |
| 8. Confirm aging | ☑ | Aging buckets + chart |
| 9. Confirm reports | ☑ | Reports read live data |
| 10. Document missing accounting capability | ✅ | This document |

## What is missing to be a real accounting / QuickBooks replacement

1. **General Ledger / double-entry** — no chart of accounts, journals, or debits/credits.
2. **Financial statements** — no P&L, balance sheet, or cash-flow.
3. **Tax** — no tax calculation engine, tax codes beyond a stored string, or filing.
4. **AP (Accounts Payable)** — vendor bills/payments not modeled as accounting.
5. **Bank reconciliation / feeds** — none.
6. **Customer balance ledger** — customers carry a `balance` field but there is no transactional
   ledger reconciling invoices, payments, credits, and refunds over time.
7. **Multi-currency, deposits, retainers, write-offs** — none.
8. **QuickBooks Online sync** — no connection (see INTEGRATION_STATUS).
9. **Server-side, tamper-proof records** — everything is client-side localStorage.

## Readiness verdict

- **Accounts Receivable:** prototype functional and demoable.
- **Full accounting / QuickBooks replacement:** **NOT ready.** Requires a backend, a general ledger,
  tax and financial reporting, AP, reconciliation, and QBO integration.

## Recommended path

Keep the current AR UX, move it behind the `api-server` with a Postgres schema, add a double-entry GL
that posts from invoices/payments, then either build financial statements or integrate QuickBooks
Online for the accounting-of-record.
