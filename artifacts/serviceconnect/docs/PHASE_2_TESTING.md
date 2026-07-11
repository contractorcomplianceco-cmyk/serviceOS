# Phase 2 — Testing

## Backend integration tests (Vitest + Supertest)

Location: `artifacts/api-server/src/__tests__/`. Run:

```
pnpm --filter @workspace/api-server exec vitest run
```

### Setup

- `vitest.config.ts` — node environment, globals, `include src/**/*.test.ts`,
  `globalSetup`, and **serial execution** (`fileParallelism: false`, single fork)
  because all suites share one dev database.
- `global-setup.ts` — runs the seed script once (idempotent,
  `onConflictDoNothing`); refuses to run against `NODE_ENV=production`.
- `helpers.ts` — a seed user-id map, `loginAs(userId)` (returns a Supertest agent
  carrying the session cookie via `dev-login`), `anon()`, and
  `createSecondTenant()` (inserts a fresh tenant + admin for isolation tests).

### Suites (35 tests, all passing)

| File | Covers |
|---|---|
| `security.test.ts` | Authentication (401/me/logout), role + nav authorization, portal scoping, cross-tenant isolation |
| `workflow.test.ts` | Migration dry-run validation, required-field + duplicate detection, repeatable validation, import-before-validate guard, audit-on-mutation, invoice balance invariant (`amount − amountPaid >= 0`), a deterministic payment→refund round-trip, a full-payment→refund cycle that flips an invoice to **Paid** then reverts it to **Invoiced**, and rejection (400, no state change) of overpayments exceeding the remaining balance and refunds exceeding the amount paid |
| `closeouts.test.ts` | HITL closeout approval: pending-by-default, non-approver blocked, approve transition, **idempotent repeat approval** (labor posts once; **inventory deducted exactly once with a single `Consumed` audit event**), send-back locked after approval |

### Design principles

- **No exact seed-count assertions** — the dev DB is shared and seeds are additive.
  Tests assert invariants (empty list for a fresh tenant, idempotent summaries,
  `amount − amountPaid` balance math) that hold regardless of concurrent data. The
  payment→refund test is self-reversing, so it leaves invoice state unchanged.
- **Self-contained mutations** — migration tests only dry-run validate and delete
  their throwaway batch; closeout tests build their own isolated work order +
  closeout. Most use no materials (no inventory side effects); the one materials
  test consumes a single unit of a real stocked item and asserts exactly-once
  deduction + a single `Consumed` audit event (keyed on the unique work-order
  number, so it is independent of concurrent/historical seed data).

## End-to-end (frontend)

E2E via the Playwright-based testing subagent verified the frontend guardrails:
role-based navigation and route guards (a technician cannot reach
`/settings/migration` or `/review` by direct URL), and the Supervisor Review
approval surface renders explicit Approve actions (nothing auto-approves).

> Note: the frontend now reads the review queue from the backend, and "Reset Demo
> Data" clears only the frontend `localStorage` — it does not re-seed the backend.
> Once a seeded closeout has been approved in the shared dev DB, the pending queue
> stays empty until the backend is re-seeded. The **authoritative** proof of the
> approval + idempotency guardrail is therefore the backend suite
> (`closeouts.test.ts`), which builds fresh data every run.

## Full check status

- **Typecheck** — `pnpm run typecheck` passes (all workspace packages).
- **Tests** — 35/35 backend integration tests pass.
- **Console** — browser console clean (only Vite HMR messages); server logs show
  no errors.
- **Lint** — no ESLint config or `lint` script is defined in this workspace, so
  there is no lint step to run (not applicable).
- **Build** — API server builds as part of its dev workflow; per workspace
  convention, artifacts are verified via `typecheck` rather than a bare `build`
  (which needs workflow-provided `PORT`/`BASE_PATH`).
