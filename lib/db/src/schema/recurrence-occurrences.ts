import {
  integer,
  pgTable,
  text,
  timestamp,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

// The occurrence ledger is the idempotency backbone of recurrence generation.
// Each (scheduleId, sequence) is unique, so re-running the worker never
// double-generates a work order for the same occurrence.
export const occurrenceStatuses = [
  "Pending",
  "Generated",
  "Skipped",
] as const;
export type OccurrenceStatus = (typeof occurrenceStatuses)[number];

export const recurrenceOccurrencesTable = pgTable(
  "recurrence_occurrences",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenantsTable.id),
    scheduleId: text("schedule_id").notNull(),
    sequence: integer("sequence").notNull(),
    scheduledDate: date("scheduled_date", { mode: "string" }).notNull(),
    status: text("status").notNull().default("Pending"),
    workOrderId: text("work_order_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    scheduleSeqUnique: uniqueIndex("recurrence_occurrence_schedule_seq_uq").on(
      table.scheduleId,
      table.sequence,
    ),
  }),
);

export const insertRecurrenceOccurrenceSchema = createInsertSchema(
  recurrenceOccurrencesTable,
).omit({ createdAt: true });
export type InsertRecurrenceOccurrence = z.infer<
  typeof insertRecurrenceOccurrenceSchema
>;
export type RecurrenceOccurrence =
  typeof recurrenceOccurrencesTable.$inferSelect;
