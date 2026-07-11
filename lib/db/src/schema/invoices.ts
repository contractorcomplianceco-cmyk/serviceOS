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

// Invoices are only created after a human billing approval (from a work order
// that is Ready for Billing). Nothing here posts to a general ledger — this is a
// prototype AR surface that records invoice + payment state only.
export const invoiceStatuses = [
  "Needs Review",
  "Ready for Invoice",
  "Missing Info",
  "Waiting on Approval",
  "Invoiced",
  "Paid",
  "Past Due",
] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export const invoicesTable = pgTable("invoices", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  customerId: text("customer_id").notNull(),
  workOrderId: text("work_order_id"),
  number: text("number").notNull(),
  lines: jsonb("lines").$type<InvoiceLine[]>().notNull().default([]),
  amount: doublePrecision("amount").notNull().default(0),
  amountPaid: doublePrecision("amount_paid").notNull().default(0),
  status: text("status").notNull().default("Invoiced"),
  issueDate: date("issue_date", { mode: "string" }),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  paidDate: date("paid_date", { mode: "string" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
