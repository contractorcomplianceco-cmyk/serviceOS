> **SUPERSEDED NOTE 2026-07-13:** Phase-1 “frontend-only” wording in this file is **historical**. Current tree includes Express API + Postgres — see repo root `README.md` and `STATUS-2026-07-13.md`. Do not quote this doc as proof there is no backend.

# ServiceConnect — Integration Status

**Every integration below is SIMULATED in the browser. No network calls leave the app.** This is a
frontend-only prototype; integrations are modeled so the workflow and UI are provable before a backend
exists.

| Integration | Status | What works today | What's simulated | To make it real |
|---|---|---|---|---|
| **ServiceChannel (inbound WOs)** | SIMULATED | WOs sourced from "ServiceChannel" render and flow through the spine | Inbound job creation is seeded, not fetched | Backend + ServiceChannel API creds; poll/webhook → create WO |
| **Multi-portal sync (outbound updates)** | SIMULATED | Portal Sync panel: Draft → Needs Approval → Ready to Send → Sending → Sent, plus Failed → Retry, Manual Copy Needed; each transition is audit-logged | No HTTP request is made; "no real network call" is shown | Backend adapters per portal; map states to portal APIs |
| **QuickBooks (accounting)** | NOT CONNECTED | Local AR: invoices, payments (partial/credit/refund), aging | No QBO connection or sync | QBO OAuth; sync invoices/payments/customers |
| **Email intake** | SIMULATED | Intake queue with parsed customer/location/PO/description; convert to WO | Items are seeded; no mailbox is read | Inbound email service + parser → intake items |
| **Notifications (email/SMS)** | SIMULATED | "Draft Reminder" / customer-update drafts | Nothing is sent | Email/SMS provider (e.g. SendGrid/Twilio) behind a backend |
| **GPS / geocoding / routing** | SIMULATED | Static map, seeded ETA/distance; data-derived assignment recommendation (skill/capacity/priority) | No live location or routing engine | Maps/geocoding + routing API; device GPS |
| **Speech-to-text (VoiceConnect)** | SIMULATED | Transcript → structured draft; edits persist; Spanish→English translation modeled | Transcription/translation are seeded | STT + translation API behind a backend |
| **File storage (documents/attachments)** | SIMULATED | Metadata, expiry status, visibility | No real upload/download | Object storage + upload endpoints |

## Human-in-the-loop is preserved across all "integrations"

No simulated integration auto-sends. Outbound portal updates, customer notifications, and invoices all
require explicit human approval, matching the non-negotiable guardrails.

## Readiness statement

- **ServiceChannel integration readiness:** architecture ready (source field, portal states, audit);
  **blocked** on backend + credentials.
- **QuickBooks readiness:** AR data model ready; **blocked** on QBO OAuth + a server.
- The fastest path to real integrations is to stand up the existing `api-server` artifact, move the
  store behind it, then implement one adapter at a time — the UI will not need to change.
