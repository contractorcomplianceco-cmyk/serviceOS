# ServiceConnect — Migration Readiness (BlueFolder + QuickBooks)

Assessment of readiness to migrate off BlueFolder and QuickBooks. **Verdict: the data model is
well-aligned (future-ready), but no importer/exporter exists.** Migration is a backend project.

## Current state

- **Domain model is comprehensive** (`src/lib/types.ts`): customers, contacts, rate rules, locations,
  work orders (trips, labor, materials, attachments, internal log), invoices + payments, inventory,
  equipment, documents, closeouts, users/roles, audit events. This maps cleanly to BlueFolder concepts.
- **Seeded data is realistic** (FL plumbing/HVAC: 14 users across 12 roles — 11 internal + 1
  Customer Portal user — 6 customers, 10 work orders, invoices, inventory, equipment, documents,
  closeouts) — useful as a mapping reference.
- **No import or export tooling exists.** There is no BlueFolder CSV/API importer and no QuickBooks
  data bridge.

## BlueFolder replacement readiness

| Capability | Status |
|---|---|
| Operational data model parity | Ready (future-ready) |
| Work-order lifecycle | Prototype functional |
| Customer/location/equipment records | Prototype functional (with create forms) |
| **Legacy data importer** | **Missing** |
| Multi-user, roles, real auth | Missing (client-side gating only) |
| Attachments/document migration | Missing (no file storage) |
| Historical audit import | Missing |

**Verdict:** the app demonstrates the target operating model, but replacing BlueFolder in production
requires a backend, real auth, file storage, and a data importer.

## QuickBooks transition readiness

| Capability | Status |
|---|---|
| AR (invoices, payments, aging) | Prototype functional |
| General ledger / statements / tax | Missing (see ACCOUNTING_READINESS) |
| **QuickBooks Online connection** | **Missing** |
| Chart-of-accounts mapping | Missing |
| Historical financials import | Missing |

**Verdict:** not ready. Either build a full GL or integrate QuickBooks Online as the
accounting-of-record; then map customers/items/invoices/payments during cutover.

## Recommended migration sequence

1. **Stand up the backend** (`api-server` + Postgres), move the store behind it, add real auth.
2. **Build a BlueFolder importer**: map customers → locations → equipment → open work orders →
   historical work orders → documents. Validate with the seeded model as the schema reference.
3. **File storage**: migrate attachments/documents to object storage.
4. **Accounting cutover**: connect QuickBooks Online (or build GL); map chart of accounts, import open
   AR, then run parallel for one cycle before switching the system of record.
5. **Go-live**: enable real ServiceChannel/portal adapters and notifications; keep human-in-the-loop
   approvals on.

## Risk notes

- Migrating **without** a server-side, tamper-proof audit log undermines compliance — prioritize the
  backend audit trail early.
- Do not present the prototype's localStorage data as migrated production data.
