import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import type { MigrationColumnMap } from "./migration-templates";

// Entities the CSV migration center can import. Deliberately limited to the
// core records a BlueFolder export contains.
export const migrationEntities = [
  "customers",
  "locations",
  "equipment",
  "inventory",
  "work-orders",
] as const;
export type MigrationEntity = (typeof migrationEntities)[number];

// A migration batch moves through: Draft (uploaded, mapping) → Validated
// (dry-run counts computed) → Imported (executed) → RolledBack. Failed batches
// keep their rows for the error report / failed-row export.
export const migrationBatchStatuses = [
  "Draft",
  "Validated",
  "Importing",
  "Imported",
  "RolledBack",
  "Failed",
] as const;
export type MigrationBatchStatus = (typeof migrationBatchStatuses)[number];

export interface MigrationBatchSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  importedRows: number;
  failedRows: number;
}

export const migrationBatchesTable = pgTable("migration_batches", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  entity: text("entity").notNull(),
  fileName: text("file_name").notNull(),
  status: text("status").notNull().default("Draft"),
  // The source column headers detected in the uploaded CSV.
  sourceColumns: jsonb("source_columns").$type<string[]>().notNull().default([]),
  mapping: jsonb("mapping").$type<MigrationColumnMap[]>().notNull().default([]),
  // True while the batch is a preview only; a real execution flips this false.
  dryRun: boolean("dry_run").notNull().default(true),
  summary: jsonb("summary").$type<MigrationBatchSummary>(),
  createdByUserId: text("created_by_user_id").notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }),
  rolledBackAt: timestamp("rolled_back_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertMigrationBatchSchema = createInsertSchema(
  migrationBatchesTable,
).omit({ createdAt: true, updatedAt: true });
export type InsertMigrationBatch = z.infer<typeof insertMigrationBatchSchema>;
export type MigrationBatch = typeof migrationBatchesTable.$inferSelect;
