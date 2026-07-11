# Phase 2 — Overview

Phase 1 delivered ServiceConnect as a **frontend-only prototype** with all state in
`localStorage`. Phase 2 adds a **real backend**: an Express + PostgreSQL API
(`artifacts/api-server`) with authentication, multi-tenant isolation, an
OpenAPI-defined contract, a background job runner, and a data-migration engine.
The React frontend (`artifacts/serviceconnect`) now reads and writes through that
API via TanStack React Query instead of local mock data.

## What Phase 2 delivered

- **Backend API** — Express server exposing `/api/*` routes, one router per domain
  (customers, locations, work-orders, closeouts, invoices, payments, inventory,
  equipment, documents, intake, quotes, notifications, migration, jobs, audit,
  portal, auth).
- **Persistent database** — PostgreSQL via Drizzle ORM (`@workspace/db`), ~40
  tables. Data now survives across sessions and users, not just one browser.
- **Authentication & sessions** — cookie-based sessions backed by a `sessions`
  table; a dev-only login shortcut for switching demo users.
- **Multi-tenancy** — every domain table carries a `tenantId`; every query is
  tenant-scoped so tenants cannot see each other's data.
- **Role-based authorization** — server-enforced role/nav guards mirroring the
  frontend permission model (12 roles).
- **Data-migration engine** — CSV import for legacy BlueFolder data with dry-run
  validation, duplicate/required-field detection, background import, and rollback.
- **Audit trail** — server-written audit events on every mutation.
- **Automated tests** — a backend integration suite (Vitest + Supertest) plus
  end-to-end verification of the frontend guardrails.

## Human-in-the-loop, preserved

The core Phase 1 principle is intact and now enforced on the server: **RoseOS
never auto-schedules, sends, or invoices.** Technician VoiceConnect closeouts land
in `Pending Review` and require an explicit approval by a Service Manager,
Administrator, or Supervisor before labor/materials post and the work order becomes
billable. See `PHASE_2_WORKFLOWS_AND_STATE_TRANSITIONS.md`.

## Document set

| Doc | Covers |
|---|---|
| `PHASE_2_OVERVIEW.md` | This file — what Phase 2 is |
| `PHASE_2_ARCHITECTURE.md` | System architecture & data flow |
| `PHASE_2_AUTHENTICATION.md` | Sessions, login, dev-login |
| `PHASE_2_AUTHORIZATION_AND_ROLES.md` | RBAC, nav gating, route guards |
| `PHASE_2_MULTI_TENANCY.md` | Tenant isolation model |
| `PHASE_2_WORKFLOWS_AND_STATE_TRANSITIONS.md` | Lifecycles & HITL approval |
| `PHASE_2_CUSTOMER_PORTAL.md` | Portal-user scoping |
| `PHASE_2_DATA_MIGRATION.md` | Migration engine |
| `PHASE_2_AUDIT_AND_COMPLIANCE.md` | Audit trail |
| `PHASE_2_BILLING_AND_ACCOUNTING.md` | Invoices, payments, AR |
| `PHASE_2_TESTING.md` | Test strategy & coverage |
| `PHASE_2_PRODUCTION_READINESS.md` | Honest readiness report |

The requirements matrix (`SERVICECONNECT_REQUIREMENTS_MATRIX.md`) has a Phase 2
backend-evidence section appended.
