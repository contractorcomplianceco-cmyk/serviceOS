import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

// Snapshot of the AI draft at submission time (immutable "original").
export interface CloseoutDraft {
  aiSummary: string;
  workPerformed: string;
  materialsDetected: string[];
  laborSuggested: string;
  returnTripReason?: string;
  quoteNotes?: string;
  missingInfo: string[];
  customerUpdateText: string;
  billingLines: string[];
  portalUpdateText: string;
  transcript: string;
  transcriptLanguage: "English" | "Spanish";
  translatedSummary?: string;
}

export const closeoutsTable = pgTable("closeouts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  workOrderId: text("work_order_id").notNull(),
  technicianId: text("technician_id").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  transcript: text("transcript").notNull().default(""),
  transcriptLanguage: text("transcript_language").notNull().default("English"),
  translatedSummary: text("translated_summary"),
  aiSummary: text("ai_summary").notNull().default(""),
  workPerformed: text("work_performed").notNull().default(""),
  materialsDetected: text("materials_detected").array().notNull().default([]),
  laborSuggested: text("labor_suggested").notNull().default(""),
  returnTripReason: text("return_trip_reason"),
  quoteNotes: text("quote_notes"),
  missingInfo: text("missing_info").array().notNull().default([]),
  customerUpdateText: text("customer_update_text").notNull().default(""),
  billingLines: text("billing_lines").array().notNull().default([]),
  portalUpdateText: text("portal_update_text").notNull().default(""),
  status: text("status").notNull().default("Pending Review"),
  // Immutable AI draft captured at submission (original before edits).
  original: jsonb("original").$type<CloseoutDraft>(),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertCloseoutSchema = createInsertSchema(closeoutsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertCloseout = z.infer<typeof insertCloseoutSchema>;
export type Closeout = typeof closeoutsTable.$inferSelect;
