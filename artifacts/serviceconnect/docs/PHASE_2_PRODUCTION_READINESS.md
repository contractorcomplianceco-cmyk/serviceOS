# Phase 2 — Production-Readiness Report

This is an **honest** assessment of what is real, what is simulated, what is
sandbox-ready, what needs credentials, and what is not yet production-ready. It does
**not** claim production or accounting readiness beyond what the tests support.

## Legend

- **REAL** — implemented, persisted, and covered by automated tests.
- **SANDBOX** — implemented and working, but with a demo-grade shortcut that must
  change before production.
- **SIMULATED** — modeled with realistic states but not connected to a live
  external system.
- **NEEDS CREDENTIALS** — architecture is ready; requires a third-party account /
  API keys to go live.
- **NOT READY** — incomplete; do not represent as production-ready.

## Assessment

| Area | Status | Notes |
|---|---|---|
| Backend API + PostgreSQL persistence | REAL | Express + Drizzle, ~40 tables, data survives sessions/users |
| Multi-tenant isolation | REAL | Every query tenant-scoped; verified with a second tenant |
| Role-based authorization (12 roles) | REAL | Server-enforced guards + `canX` helpers; tested |
| Closeout approval + idempotency (HITL) | REAL | Transactional, idempotent; no double-post (tested) |
| Audit trail | REAL (app-level) | Written on mutations; not yet tamper-evident/WORM |
| Data migration (CSV dry-run/import/rollback) | REAL | Dry-run, duplicate/required detection tested |
| Billing / AR (invoices, partial/credit/refund) | REAL (partial) | `balance = amount − amountPaid` holds; payment→refund round-trip tested; no GL |
| Authentication (sessions) | REAL | Real credential login (`POST /auth/login`, argon2 + throttling) issues the cookie session; the `dev-login` demo switcher is now hard-disabled when `NODE_ENV=production` (returns 403, no cookie), verified by a test. `SESSION_SECRET` required at startup |
| Customer portal | SANDBOX | API-scoped and guarded; no external branded self-service experience |
| GPS smart routing | SIMULATED | Seeded ETA/distance; needs a real geocoding/routing API |
| ServiceChannel / vendor portals | SIMULATED | State machine only; needs vendor APIs |
| Notifications (email/SMS) | NEEDS CREDENTIALS | Draft/records only; needs an email/SMS provider |
| QuickBooks Online sync | NEEDS CREDENTIALS | AR model exists; needs QBO OAuth + sync |
| Speech-to-text (VoiceConnect) | NEEDS CREDENTIALS | Structured draft flow real; needs a real STT provider |
| File/document storage | NEEDS CREDENTIALS | Metadata modeled; needs object storage wiring |
| General ledger / double-entry accounting | NOT READY | Out of scope for Phase 2 |
| Recurring-jobs engine | NOT READY | Schedule tables exist; generation engine incomplete |

## Must-fix before production

1. ~~**Disable `dev-login`**~~ **DONE** — `dev-login`/`dev-users` return 403 when
   `NODE_ENV=production` (runtime check, verified by a test), and real credential
   login (`POST /auth/login`) issues the same cookie session. MFA/SSO remain future
   enhancements.
2. **Serve over HTTPS** so session cookies are `Secure` (the cookie already sets
   `Secure` in production); ensure `SESSION_SECRET` is set per environment (enforced
   at startup — the server refuses to boot without it).
3. **Tenant-isolation review discipline** — isolation is enforced by query filters,
   not Postgres RLS. Every new route must scope by `tenantId`; consider adding RLS
   as defense in depth.
4. **Harden the audit log** toward tamper-evidence if compliance requires it.
5. **Wire external providers** (email/SMS, STT, geocoding, QBO, object storage)
   before advertising those features as live.
6. **Do not market as accounting-ready** until a general ledger and QBO sync exist.

## What is safe to demo today

The full internal operator experience on real persisted data: intake → work orders
→ dispatch → technician mobile + VoiceConnect draft → supervisor approval (with
inventory deduction) → billing/AR → audit, plus admin data migration — all
role-gated, multi-tenant, and human-in-the-loop. This is a credible, testable
sandbox, not a finished production SaaS.
