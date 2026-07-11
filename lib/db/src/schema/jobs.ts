import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

// A durable, DB-backed background job. A server-side poller claims due jobs,
// runs the handler registered for its type, and records the outcome — so
// recurring/async work runs independent of any open browser tab.
export const jobStatuses = [
  "Pending",
  "Running",
  "Succeeded",
  "Failed",
] as const;
export type JobStatus = (typeof jobStatuses)[number];

// The set of work the queue knows how to run. Each maps to a handler in the
// api-server job registry.
export const jobTypes = [
  "recommendations.generate",
  "notifications.retry",
  "portal.sync-retry",
  "contracts.reminders",
  "documents.reminders",
  "recurrence.generate",
  "migration.process",
  "closeout.transcribe",
  "invoice.pdf",
] as const;
export type JobType = (typeof jobTypes)[number];

export interface JobLogEntry {
  at: string;
  status: JobStatus;
  detail: string;
}

export const jobsTable = pgTable("jobs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  type: text("type").notNull(),
  status: text("status").notNull().default("Pending"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  result: jsonb("result").$type<Record<string, unknown>>(),
  // When the job is eligible to run (supports scheduled + backoff retries).
  runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  lastError: text("last_error"),
  // For recurring jobs: the interval in seconds to reschedule after success.
  // Null means a one-shot job.
  recurringSeconds: integer("recurring_seconds"),
  // A stable key for recurring jobs so we don't enqueue duplicates.
  dedupeKey: text("dedupe_key"),
  log: jsonb("log").$type<JobLogEntry[]>().notNull().default([]),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  createdByUserId: text("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
