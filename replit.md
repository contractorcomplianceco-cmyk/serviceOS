# ServiceConnect with RoseOS Intelligence

A field-service operating system for a plumbing/HVAC service company — replacing BlueFolder + QuickBooks. Frontend-only prototype with rich seeded mock data (no real backend/APIs).

## Run & Operate

- App runs via the `artifacts/serviceconnect: web` workflow (Vite dev server, reads `PORT`/`BASE_PATH`).
- `pnpm --filter @workspace/serviceconnect run typecheck` — typecheck the app.
- Do NOT run `pnpm dev` at the repo root; use the workflow.

## Stack

- React 18 + TypeScript + Vite + Tailwind + shadcn/ui, routing via `wouter`.
- State: React context store in `src/lib/store.tsx`, persisted to `localStorage` (key `serviceconnect_data_v3`).
- Charts: Recharts. Icons: lucide-react.

## Where things live

- `src/lib/types.ts` — all domain types (source of truth).
- `src/lib/mock-data.ts` — seeded demo data (10 users/8 roles, 6 customers, 10 work orders, invoices, inventory, equipment, docs, closeouts, AI recommendations).
- `src/lib/store.tsx` — global store + actions (`useAppStore()`); `resetData()` restores seed.
- `src/lib/permissions.ts` — role → nav access (`canAccess`, `navFor`), `canApproveCloseouts`, `isFieldRole`.
- `src/lib/ui.ts` — shared class/format helpers (`priorityClass`, `statusClass`, `billingClass`, `portalClass`, `money`, `shortDate`, `relativeDay`).
- `src/App.tsx` — routes + `Protected` route guards.
- `src/pages/*` — one file per screen. `src/components/layout/*` — Sidebar/Header/AppLayout.

## Architecture decisions

- **Human-in-the-loop guardrails are core:** RoseOS (AI) never auto-schedules, sends, or invoices. Every AI action is a draft/suggestion the user must approve (see `Intelligence.tsx`, `VoiceConnect.tsx`, `SupervisorReview.tsx`).
- **VoiceConnect output is always a draft** — technician closeouts go to `Pending Review`; a Service Manager/Administrator approves via `/review` before anything reaches billing.
- **Role gating is enforced at the route level**, not just nav visibility — `Protected` wrappers in `App.tsx` block direct URL access; `/review` is restricted to `canApproveCloseouts` roles, `/tech*` to field roles.
- **Color semantics:** GREEN = completed/approved, RED = urgent/emergency/past-due, AMBER = warnings/pending only. Defined centrally in `src/lib/ui.ts`.

## Product

Role-based views across intake, work orders (trips/labor/materials/attachments), dispatch, technicians, customers, locations, inventory, equipment, billing, accounting/AR, documents/compliance, reports, and RoseOS intelligence. Separate mobile technician shell (`/tech`) with VoiceConnect voice-closeout drafting. 8 roles switchable from the header or Settings.

## Gotchas

- The `AIRecommendation` type is intentionally simple (`type`/`severity`/`primaryAction`/`needsApproval`) — recommendations are dismissed (removed), not status-tracked.
- Switching the active user persists via `currentUserId` in localStorage; use Settings → Reset Demo Data to restore seed state.

## Pointers

- See the `pnpm-workspace` skill for workspace structure and conventions.
