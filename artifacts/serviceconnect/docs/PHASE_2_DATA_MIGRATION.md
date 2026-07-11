# Phase 2 — Data Migration (BlueFolder import)

## Purpose

Import legacy BlueFolder data (customers, locations, and other entities) from CSV
into ServiceConnect, safely and reversibly. The engine lives in
`artifacts/api-server/src/lib/migration/engine.ts`; routes are `/api/migration/*`
(**administrator-only**, `canManageMigration`). Tables: `migration_batches`,
`migration_rows`, `migration_templates`.

## Batch lifecycle

```
Draft ──validate──► Validated ──import──► Importing ──► Imported
  ▲                    │                                  │
  └──── remap ─────────┘                          rollback ▼
                                                       RolledBack
```

1. **Create** (`POST /api/migration/batches`, body `{ entity, fileName, csv }`) —
   parses the CSV, guesses a column mapping (or accepts an explicit one), and stores
   a `Draft` batch with per-row records. Returns `201`.
2. **Remap** (`PATCH /api/migration/batches/:id/mapping`) — adjust the column
   mapping; resets the batch to `Draft`. Blocked once `Imported`/`Importing`.
3. **Validate / dry run** (`POST /api/migration/batches/:id/validate`) — runs the
   full validation **without inserting anything** (`dryRun: true`). Produces a
   summary: `totalRows`, `validRows`, `errorRows`, `duplicateRows`. Detects:
   - **Required-field errors** (e.g. a customer with no `name`).
   - **Duplicates** against existing records (natural key).
   Validation is repeatable and side-effect free.
4. **Import** (`POST /api/migration/batches/:id/import`) — only allowed from
   `Validated`. Flips the batch to `Importing` and enqueues a background
   `migration.process` job (mode `execute`); the client polls until it settles to
   `Imported`/`Failed`. A failed enqueue reverts the status so the batch is never
   orphaned in `Importing`.
5. **Rollback** (`POST /api/migration/batches/:id/rollback`) — undo an import.
6. **Delete** (`DELETE /api/migration/batches/:id`) — remove a batch and its rows.

## Entity specs

`ENTITY_SPECS` declares each importable entity's target fields, which are required,
their type, and the natural key used for duplicate detection. Example — customers:
`name` (required), plus optional `sourceId` (BlueFolder ID), `industry`, `phone`,
`email`, `status`, `taxCode`.

## Frontend

The Data Migration Center is a section inside **Settings** (`/settings/migration`),
guarded by `canManageMigration`. It is not a top-level nav item.

## Test coverage

`src/__tests__/workflow.test.ts` (all dry-run only — never imports, so seed data is
untouched; each test deletes its throwaway batch):
- Clean batch validates to `Validated` with `validRows === totalRows`, `dryRun`.
- A row missing a required field raises `errorRows >= 1`.
- A row duplicating an existing customer (`RaceTrac`) raises `duplicateRows >= 1`.
- Validating twice yields an **identical summary** (no side effects).
- Import before validation is rejected (`400`).
