# ServiceConnect — Fixes Completed (this pass)

All changes are frontend-only, preserve the dark design/routes/testids/permission gating, and keep
the human-in-the-loop guardrails intact.

## Foundation (store + types)

- **Audit trail added.** New `AuditEvent` type + `auditLog` state slice. A `withAudit` helper writes
  an immutable event on every material mutation (create, convert, assign, status change, check-in/out,
  labor/material add, inventory consumption, closeout approval, payment, portal sync).
- **Payments model added.** `Payment` / `PaymentType` (`Payment | Partial Payment | Credit | Refund`)
  plus `Invoice.payments[]` and `Invoice.amountPaid`.
- **Portal sync states expanded.** `PortalSyncStatus` now includes `Draft`, `Sending`, `Retry`,
  `Cancelled` alongside the originals to support a realistic simulator.
- **localStorage key bumped to `serviceconnect_data_v3`** so new fields seed cleanly.
- **New store actions** (all persist + audit-log): `convertIntakeToWorkOrder`, `addLaborEntry`,
  `addMaterialEntry` (deducts inventory when linked), `addWorkOrderNote`, `technicianCheckIn`,
  `technicianCheckOut`, `approveCloseout` (posts labor/materials + deducts inventory), `sendBackCloseout`,
  `addCustomer`, `addLocation`, `addEquipment`, `recordPayment`, `sendPortalUpdate`, `logAudit`.
  All pre-existing action signatures were preserved.

## Operational spine wired

- **Intake → Work Order** (`IntakeQueue.tsx`): "Approve & Create WO" now creates a real, persisted
  work order (`Need Scheduled`) and navigates to it; a separate "Skip" dismisses. **E2E verified.**
- **Work Order detail** (`WorkOrderDetail.tsx`): add-labor, add-material (with inventory dropdown that
  deducts stock, plus free-text non-stock), and add-note editors; an **Audit History** tab scoped to
  the WO; and a **Portal Sync (Simulated)** panel advancing Draft → Needs Approval → Ready to Send →
  Sending → Sent with Failed → Retry and Manual Copy Needed — clearly labeled "no real network call."
- **Technician mobile** (`TechnicianMobile.tsx`): working Check In / Check Out with `On Site` status
  and trip timestamps.
- **VoiceConnect** (`VoiceConnect.tsx`): technician edits (work performed, materials, labor, customer
  update, portal text, quote notes, return-trip reason) now persist to the closeout on "Submit for
  Review" and set status `Pending Review` — nothing reaches billing here (guardrail).
- **Supervisor review** (`SupervisorReview.tsx`): Approve routes through `approveCloseout` (posts labor
  + materials to the WO and **deducts matched inventory**, sets `Ready for Billing`); Send Back uses
  `sendBackCloseout`. Role gating preserved.

## Billing / Accounting

- **Accounting** (`Accounting.tsx`): replaced one-click mark-paid with a payment dialog supporting
  Payment / Partial Payment / Credit / Refund + method; shows per-invoice Paid and remaining Balance,
  lists recorded payments, and auto-flips to `Paid` when fully covered. **Partial payment E2E verified.**

## Create forms

- New dialogs for **Work Orders** (manual), **Customers**, **Locations**, **Equipment**, each writing
  through the audit-logged store actions.

## RoseOS made data-derived

- New `src/lib/recommendations.ts` `computeRecommendations(store)` derives recommendations from live
  data (unassigned emergencies, over-capacity techs, low stock, expiring/expired documents, past-due
  AR, ready-for-billing, scheduled-but-no-check-in). Used by the dashboard and `/intelligence`;
  dismissals persist via `dismissedRecIds`. Human approval still required for every action.

## Global search

- Header search now returns real grouped results across work orders, customers, locations, equipment,
  technicians, and invoices, each navigating to the right route.

## Audit trail surfaces

- Global **Audit Trail** view in Settings (admin) with entity-type filtering; per-work-order Audit
  History tab.

## Verification

- `pnpm --filter @workspace/serviceconnect run typecheck` — **clean**.
- App boots; browser console shows only Vite HMR (no errors).
- Playwright e2e — intake conversion, partial payment, and permission gating **passed** (see
  END_TO_END_TEST_RESULTS).
