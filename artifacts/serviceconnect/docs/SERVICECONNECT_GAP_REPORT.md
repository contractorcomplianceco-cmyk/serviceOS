# ServiceConnect — Gap Report

State of the product as found at the start of this pass, and the gaps that remain after it.

## Gaps found at audit start (Phase 2)

### Broken links in the operational spine (looked done, wasn't)
- **Intake → Work Order** conversion did nothing but dismiss the intake item. No WO was created.
- **Technician check-in/out** did not exist anywhere.
- **VoiceConnect** technician edits were discarded — nothing persisted to the closeout.
- **Supervisor approval** flipped a status but did **not** post labor/materials to the WO and did
  **not** deduct inventory. The "materials update inventory" requirement was unmet.
- **No audit trail** existed at all — a non-negotiable guardrail requirement was entirely missing.

### Static content masquerading as function
- **RoseOS recommendations** were hardcoded sample cards, not derived from current data.
- **Global search** was a cosmetic input with no results.
- **Portal/ServiceChannel sync** showed a status badge but had no state transitions.

### Missing CRUD
- No create forms for Work Orders (manual), Customers, Locations, or Equipment.

### Accounting depth
- Only a one-click "mark paid"; no partial payments, credits, or refunds; no balance math.

## Gaps remaining after this pass (honest)

### Blocked by the absence of a backend (cannot be truly completed in a frontend-only prototype)
- **Real integrations**: ServiceChannel, other portals, QuickBooks Online, email intake, SMS/email
  notifications — all remain **simulated**.
- **Authentication & multi-user security**: role gating is client-side only; there is no real login,
  session server, encryption, or per-field access control.
- **Durable/tamper-proof audit log**: the audit trail is real but lives in localStorage.
- **File storage**: document vault and work-order attachments display metadata; there is no real
  upload/storage backend.
- **Real GPS/geocoding**: the map and ETA/distance are simulated.
- **Real speech-to-text** for VoiceConnect (transcripts are seeded/simulated).

### Not yet built (buildable in-prototype, out of scope this pass)
- **Customer Portal** (R13) — no external customer-facing experience.
- **Recurring Jobs & Contracts** (R19) — no recurrence engine.
- **Vendor/Material Pricing Intelligence** (R22) — data fields exist; no pricing engine.
- **General Ledger / double-entry accounting** (R21) — AR only.

### Partial (works, but shallow)
- Inventory **transfers** and **reservations** across locations (Tampa/Orlando/Truck/Tech) are
  modeled in data but not fully surfaced as workflows; consumption/deduction is wired.
- GPS routing recommendation is data-derived for assignment but not a true routing optimizer.
- Notifications produce **drafts** only (no send).

## Gap severity ranking (for planning)

1. **Backend + auth** — unlocks integrations, security, durable audit, storage. Highest leverage.
2. **QuickBooks/GL** — required for the "accounting replacement" claim.
3. **Real ServiceChannel inbound** — core to the "operational hub" claim.
4. **Customer portal & recurring jobs** — feature completeness.
5. **Pricing intelligence** — margin optimization.
