import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { migrationBatchesTable } from "./migration-batches";

// A single CSV row within a migration batch, kept for validation preview, the
// row-level error report, failed-row export, and safe rollback (createdEntityId
// records what was inserted so it can be removed).
export const migrationRowStatuses = [
  "Valid",
  "Error",
  "Duplicate",
  "Imported",
  "Failed",
  "RolledBack",
] as const;
export type MigrationRowStatus = (typeof migrationRowStatuses)[number];

export interface MigrationRowError {
  field: string;
  message: string;
}

export const migrationRowsTable = pgTable("migration_rows", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  batchId: text("batch_id")
    .notNull()
    .references(() => migrationBatchesTable.id),
  rowNumber: integer("row_number").notNull(),
  // The raw CSV cells keyed by source header.
  raw: jsonb("raw").$type<Record<string, string>>().notNull().default({}),
  // The mapped/normalized values keyed by target field.
  mapped: jsonb("mapped")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  status: text("status").notNull().default("Valid"),
  errors: jsonb("errors").$type<MigrationRowError[]>().notNull().default([]),
  // The original external identifier from the source system, preserved for
  // traceability and duplicate detection.
  sourceId: text("source_id"),
  // The id of the entity created when this row was imported (used for rollback).
  createdEntityId: text("created_entity_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertMigrationRowSchema = createInsertSchema(
  migrationRowsTable,
).omit({ createdAt: true });
export type InsertMigrationRow = z.infer<typeof insertMigrationRowSchema>;
export type MigrationRow = typeof migrationRowsTable.$inferSelect;
