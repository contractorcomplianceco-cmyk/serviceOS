---
name: ServiceConnect schema gotchas
description: Non-obvious pre-existing tables/constraints in lib/db that cause duplicate-definition traps
---

# ServiceConnect (api-server) DB schema gotchas

- **`document_reminders` already exists** in `lib/db/src/schema/documents.ts` (NOT a
  separate `document-reminders.ts` file). It is a **manual, user-created** reminder
  feature (columns: `remindAt`, `reason`, `status` = Pending/Sent/Dismissed,
  `createdByName`), consumed by `routes/documents.ts`. There is **no** `type`/`dueDate`/
  `message` column and **no** unique index for dedupe.
  **Why:** A separate barrel file re-exporting a second `document_reminders` pgTable
  causes TS2308 "already exported" errors AND a conflicting `drizzle-kit push` that can
  reshape the live table. Automated expiration reminders reuse this table with
  app-level dedupe (query by documentId+remindAt+createdByName), stamping
  `createdByName = "RoseOS Document Reminder Worker"` to distinguish system rows.
  **How to apply:** Before adding any schema, grep the whole `lib/db/src/schema/` tree
  for the pgTable name — several tables live inside a broader file, not their own.

- **Migrations use `drizzle-kit push`** (`pnpm --filter @workspace/db run push`), no
  migration files. After schema edits, push then `pnpm run typecheck:libs` before leaf
  typechecks.

- **Job type union** is `jobTypes` in `lib/db/src/schema/jobs.ts`; a new background job
  must be added there AND registered in `artifacts/api-server/src/lib/jobs/handlers.ts`
  AND (if recurring) seeded in `artifacts/api-server/src/lib/jobs/index.ts` RECURRING.
