# ServiceConnect — Requirements Matrix

Legend for **Status**: FULL = fully functional · PROTO = prototype functional · SIM = simulated
integration · FUTURE = future-ready architecture · MISSING = incomplete/missing.

Persistence Verified / Permission Verified / Test Result: Y = yes, N = no, N/A = not applicable,
PARTIAL = partial. "Persistence" = survives reload via localStorage.

| ID | Module | Requirement | Status | Evidence | Route | Data Source | Persistence Verified | Permission Verified | Test Result | Fix Applied | Remaining Work | Blocker |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R1 | Overall Objective | Unified field-service OS | PROTO | App boots, all modules reachable | `/` | store | Y | Y | PASS | — | Backend/multi-user | Needs backend |
| R2 | Work-Order Intake | Intake queue + convert to WO | PROTO | `convertIntakeToWorkOrder` creates real WO | `/intake` | store.intake | Y | Y | PASS (e2e) | Wired dead "Approve" button | Live email/portal parsing | Needs backend |
| R3 | Work-Order Mgmt | Trips, labor, materials, notes, attachments, status | PROTO | Add-labor/material/note editors; status flow | `/work-orders/:id` | store.workOrders | Y | Y | PASS | Added labor/material/note editors + audit tab | File upload storage | Needs storage |
| R4 | Dispatch Calendar | Schedule/assign technicians | PROTO | Calendar + assign action | `/dispatch` | store | Y | Y | PASS | — | Drag-reschedule polish | — |
| R5 | GPS Smart Routing | Distance/skill/capacity routing | SIM | Static map; seeded ETA/distance; data-derived assign rec | `/dispatch`, `/` | store + mock geo | PARTIAL | Y | PARTIAL | Recommendation now data-derived | Real GPS/geocoding | Needs GPS API |
| R6 | Smart Lists / Queues | Operational queues & filters | PROTO | Filtered lists across modules | multiple | store | Y | Y | PASS | — | Saved custom views | — |
| R7 | Technician Mobile | Mobile shell + check-in/out | PROTO | `technicianCheckIn/Out`, mobile layout | `/tech` | store | Y | Y | PASS | Added check-in/out | Native app / offline | Needs native |
| R8 | VoiceConnect | Voice closeout → structured draft | PROTO | Edits persist; draft→review | `/voiceconnect` | store.closeouts | Y | Y | PASS | Persist edits on submit | Real speech-to-text | Needs STT API |
| R9 | Supervisor Review | Approve closeout → post + deduct | FULL | `approveCloseout` posts labor/materials, deducts stock | `/review` | store | Y | Y | PASS | Centralized approval logic | — | — |
| R10 | ServiceChannel/Portals | Multi-portal sync | SIM | Portal simulator w/ states, labeled SIMULATED | `/work-orders/:id` | store | Y | Y | PASS | Added state simulator | Real portal APIs | Needs vendor APIs |
| R11 | Customer & Location | CRUD + management | PROTO | Create dialogs `addCustomer/addLocation` | `/customers`, `/locations` | store | Y | Y | PASS | Added create forms | Merge/dedupe tools | — |
| R12 | Document Vault | Docs + expiry status | PROTO | Docs list w/ statuses | `/documents` | store.documents | Y | Y | PASS | — | Real file upload/storage | Needs storage |
| R13 | Customer Portal | External customer-facing portal | MISSING | — | — | — | N | N/A | N/A | — | Build entire portal | Needs backend/auth |
| R14 | Employee/Tech Profiles | Skills, capacity, zone | PROTO | Profiles + capacity fields | `/technicians` | store.users | Y | Y | PASS | — | HR fields, cert tracking | — |
| R15 | Roles & Permissions | Route-level gating (8 roles) | FULL | `Protected` guards; tech blocked from /review | all | permissions.ts | Y | Y | PASS (e2e) | — | Field-level ACLs | — |
| R16 | Notifications | Email/SMS to customers/techs | SIM | Draft reminders only; no send | `/accounting` etc | store | PARTIAL | Y | PARTIAL | — | Real email/SMS | Needs provider |
| R17 | Inventory | Stock, deduction, reorder | PROTO | Deduct on material use/approval; reorder recs | `/inventory` | store.inventory | Y | Y | PASS | Consumption/deduction wired | Transfers/reservations UI | — |
| R18 | Equipment/Assets | Asset records + WO linkage | PROTO | Create dialog + linkage | `/equipment` | store.equipment | Y | Y | PASS | Added create form | Service history depth | — |
| R19 | Recurring Jobs/Contracts | Recurring schedules | MISSING | — | — | — | N | N/A | N/A | — | Build recurring engine | — |
| R20 | Billing Workflow | Draft → invoice → issue | PROTO | Billing draft & invoice flow | `/billing` | store.invoices | Y | Y | PASS | — | Tax engine, PDF export | — |
| R21 | Accounting / QuickBooks | AR, payments, aging | PROTO | Partial/credit/refund payments, aging | `/accounting` | store.invoices | Y | Y | PASS (e2e) | Added partial/credit/refund | General ledger, QBO sync | Needs backend/QBO |
| R22 | Vendor/Material Pricing | Pricing intelligence | FUTURE | Vendor/cost fields exist | `/inventory` | store | PARTIAL | Y | N/A | — | Pricing engine | — |
| R23 | Reporting & Analytics | Charts/KPIs from data | PROTO | Recharts from live store | `/reports` | store | Y | Y | PASS | — | Export, custom reports | — |
| R24 | RoseOS Intelligence | Data-derived recommendations | PROTO | `computeRecommendations(store)` | `/`, `/intelligence` | store | Y | Y | PASS | Made recs data-derived | ML ranking | — |
| R25 | Dashboard & UX | Premium dark cockpit | FULL | Operations Cockpit renders | `/` | store | Y | Y | PASS | Preserved | — | — |
| R26 | Global Search | Cross-entity search | PROTO | Grouped results, 6 entity types | header | store | Y | Y | PASS | Implemented real search | Fuzzy/rank | — |
| R27 | Audit Trail | Immutable action history | FULL | `auditLog` on every mutation; Settings view + per-WO tab | Settings, `/work-orders/:id` | store.auditLog | Y | Y | PASS | Built from scratch | Tamper-proof server log | Needs backend |
| R28 | BlueFolder Migration | Import legacy data | FUTURE | Data model aligns; no importer | — | — | N | N/A | N/A | — | Build importer/mapping | Needs backend |
| R29 | QuickBooks Transition | Migrate accounting | FUTURE | AR model exists; no QBO | — | — | N | N/A | N/A | — | QBO OAuth + sync | Needs QBO |
| R30 | Security & Privacy | Auth, encryption, ACLs | PROTO | Client-side role gating only | all | — | N | PARTIAL | PARTIAL | — | Real auth + encryption | Needs backend |
| R31 | Client Operating Context | Captured business context | PROTO | Seeded realistic FL plumbing/HVAC data | all | mock-data | Y | N/A | N/A | — | — | — |
| R32 | Future Features | Roadmap hooks | FUTURE | Documented | — | — | N/A | N/A | N/A | — | Per roadmap | — |
| R33 | Guardrails | Human-in-the-loop | FULL | No auto-send/invoice; approvals required | all | store | Y | Y | PASS | Preserved & reinforced | — | — |

## Roll-up

- FULL: R9, R15, R25, R27, R33 (+R24 borderline) → **6**
- PROTO: R1, R2, R3, R4, R6, R7, R8, R11, R12, R14, R17, R18, R20, R21, R23, R26, R31 → **16**
- SIM: R5, R10, R16 → **3**
- FUTURE: R22, R28, R29, R32 → **4**
- MISSING: R13, R19, R30(partial) → **4** (R30 counted as partial/at-risk)

---

# Phase 2 — Backend Evidence Update

Phase 1 (above) was a frontend-only prototype persisting to `localStorage`. Phase 2
added a real Express + PostgreSQL backend (`artifacts/api-server`), so several
requirements advanced. This section records, per requirement changed by Phase 2:
previous status → new status, implementation evidence, API route, database table,
whether a permission test and a persistence test exist, and the remaining blocker.

Status legend is the same as above (FULL/PROTO/SIM/FUTURE/MISSING). "Permission
Test" / "Persistence Test" = an automated backend test in
`artifacts/api-server/src/__tests__/` covers it (Y/N/N/A). "Persistence" now means
survives via the PostgreSQL database, not localStorage.

| ID | Requirement | Prev → New | Implementation Evidence (Phase 2) | API Route | DB Table | Permission Test | Persistence Test | Remaining Blocker |
|---|---|---|---|---|---|---|---|---|
| R1 | Unified field-service OS | PROTO → PROTO+ | Real backend, multi-user, tenant-scoped; frontend reads/writes via React Query | `/api/*` | (all) | Y | Y | Real auth (replace dev-login) |
| R9 | Supervisor Review approval | FULL → FULL | Transactional approve posts labor/materials, deducts stock; **idempotent** (no double-post) | `POST /api/closeouts/:id/approve` | `closeouts`, `work_orders`, `inventory` | Y | Y | — |
| R13 | Customer Portal | MISSING → PROTO | API portal scoped to one `customerId`; dashboard/WOs/quotes/invoices | `/api/portal/*` | `users`, `customers` | Y | Y | External branded self-service UX |
| R15 | Roles & Permissions | FULL → FULL | Server-enforced `requireRoles`/`requireNav` + `canX` (12 roles), mirrored on client | all | `users` | Y | N/A | Field-level ACLs |
| R16 | Notifications | SIM → SIM | Notification records/state persisted; no live send | `/api/notifications` | `notifications`, `notification_templates` | N/A | N (not tested) | Email/SMS provider credentials |
| R17 | Inventory | PROTO → PROTO+ | Ledger with negative-stock protection; deduction on approval, **exactly-once** on retry | `/api/inventory` | `inventory`, `inventory_transactions` | Y (via approve) | Y | Transfers/reservations UI |
| R20 | Billing Workflow | PROTO → PROTO+ | Invoice only from billable WO; persisted | `/api/invoices` | `invoices` | N (create-gate not tested) | Y (balance invariant) | Tax engine, PDF export |
| R21 | Accounting / AR | PROTO → PROTO+ | Partial/credit/refund payments; `balance = total − amountPaid` invariant tested | `/api/payments` | `payments`, `invoices` | Y | Y | General ledger, QBO sync |
| R27 | Audit Trail | FULL → FULL | `writeAudit()` on every mutation; role-gated read w/ filters | `/api/audit` | `audit_log` | Y | Y | Tamper-evident/WORM store |
| R28 | BlueFolder Migration | FUTURE → PROTO | CSV engine: dry-run validate, duplicate/required detection, import, rollback | `/api/migration/*` | `migration_batches`, `migration_rows` | Y | Y | Broader entity coverage / prod cutover |
| R30 | Security & Privacy | PROTO → PROTO+ | Real cookie sessions + tenant isolation + server RBAC | `/api/auth/*`, all | `sessions`, `login_attempts` | Y | Y | **Disable dev-login**, HTTPS, encryption at rest, RLS |
| R33 | Guardrails (HITL) | FULL → FULL | Server enforces: no auto-schedule/send/invoice; approval required; idempotent | all | (all) | Y | Y | — |

## Phase 2 test index

- **Permission / isolation** — `src/__tests__/security.test.ts` (auth, role/nav
  authorization, portal scoping, cross-tenant isolation).
- **Workflow / calculation** — `src/__tests__/workflow.test.ts` (migration dry-run,
  duplicate/required-field, repeatable validation, audit-on-mutation, invoice math).
- **HITL approval** — `src/__tests__/closeouts.test.ts` (pending-by-default,
  non-approver blocked, approve transition, idempotent repeat approval — labor
  posts once and inventory is deducted exactly once with a single `Consumed` audit
  event — and send-back lock).

26/26 tests pass. See `PHASE_2_TESTING.md` and `PHASE_2_PRODUCTION_READINESS.md`.
