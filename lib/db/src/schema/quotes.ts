import {
  doublePrecision,
  jsonb,
  pgTable,
  text,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

// Quotes are estimates a customer can approve or reject from the portal.
// Approval is a human-in-the-loop gate — a quote never auto-converts to work.
export const quoteStatuses = [
  "Draft",
  "Sent",
  "Approved",
  "Rejected",
  "Expired",
] as const;
export type QuoteStatus = (typeof quoteStatuses)[number];

export interface QuoteLine {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export const quotesTable = pgTable("quotes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  customerId: text("customer_id").notNull(),
  locationId: text("location_id"),
  workOrderId: text("work_order_id"),
  number: text("number").notNull(),
  title: text("title").notNull().default(""),
  lines: jsonb("lines").$type<QuoteLine[]>().notNull().default([]),
  amount: doublePrecision("amount").notNull().default(0),
  status: text("status").notNull().default("Draft"),
  notes: text("notes"),
  validUntil: date("valid_until", { mode: "string" }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decidedByName: text("decided_by_name"),
  decisionNote: text("decision_note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertQuoteSchema = createInsertSchema(quotesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotesTable.$inferSelect;
