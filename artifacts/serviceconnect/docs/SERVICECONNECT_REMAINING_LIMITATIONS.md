# ServiceConnect — Remaining Limitations

Written plainly and honestly. This is a **frontend-only prototype**. The following are real limits,
not bugs, and most require a backend to resolve.

## Architectural limits (require a backend)

1. **No real persistence beyond the browser.** All data lives in `localStorage`. Clearing the browser,
   using another device, or using another user wipes/΄isolates the data. Not multi-user.
2. **No authentication or real security.** The role switcher is a demo convenience. Route gating is
   enforced in the client only and can be bypassed by anyone with developer tools. There is no login,
   session server, password/SSO, encryption at rest, or field-level access control.
3. **All external integrations are simulated:**
   - **ServiceChannel / other portals** — the sync panel is a state machine in the browser; it makes
     no network calls. Labeled "SIMULATED".
   - **QuickBooks** — no connection; AR is modeled locally.
   - **Email intake** — intake items are seeded; there is no inbox parser.
   - **Notifications (email/SMS)** — only drafts are produced; nothing is sent.
   - **GPS/geocoding** — the map and ETA/distance are static/seeded.
   - **Speech-to-text** — VoiceConnect transcripts are seeded/simulated.
4. **Audit trail is not tamper-proof.** It is real and comprehensive within the app, but stored
   client-side; a production audit log must be server-side and append-only.
5. **No file storage.** Document vault and work-order attachments show metadata only; there is no
   upload/download of real files.

## Feature completeness limits

6. **Accounting is AR-only.** Invoicing, payments (partial/credit/refund), and aging work. There is
   **no general ledger, no double-entry, no chart of accounts, no tax filing** — it is not a QuickBooks
   replacement yet. See ACCOUNTING_READINESS.
7. **Customer Portal (R13)** is not built.
8. **Recurring Jobs & Contracts (R19)** are not built.
9. **Vendor/Material Pricing Intelligence (R22)** — vendor and cost fields exist, but there is no
   pricing engine or margin optimizer.
10. **Inventory transfers & reservations** across locations are modeled in the data but not fully
    surfaced as end-user workflows; **consumption/deduction is wired**.
11. **GPS routing** recommends assignments from real data (skill/capacity/emergency) but is not a true
    distance-optimizing router.
12. **BlueFolder / QuickBooks migration** — the data model is aligned but there is **no importer**.

## Testing limits

13. Automated coverage this pass focused on the **core spine** (intake conversion, partial payment,
    permission gating) via Playwright, plus a clean typecheck and console-error check. Broader unit /
    route / persistence / form-validation suites are recommended but not yet added (the prototype has
    no test runner wired for the app package).

## What is genuinely solid (so expectations are calibrated)

- The operational spine now flows end-to-end **with persistence**: intake → WO → schedule → check-in →
  VoiceConnect draft → supervisor approval → inventory deduction → billing → payment → AR → audit log.
- Human-in-the-loop guardrails are enforced and cannot be skipped through the UI.
- Role gating blocks direct URL access (verified).
- The premium dark design is fully intact.
