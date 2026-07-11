import {
  doublePrecision,
  pgTable,
  text,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

// Payment records are informational only — recording a payment updates invoice
// AR state (amountPaid / status). There is no payment gateway and no ledger.
export const paymentTypes = [
  "Payment",
  "Partial Payment",
  "Credit",
  "Refund",
] as const;
export type PaymentType = (typeof paymentTypes)[number];

export const paymentsTable = pgTable("payments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  invoiceId: text("invoice_id").notNull(),
  customerId: text("customer_id").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  amount: doublePrecision("amount").notNull().default(0),
  method: text("method").notNull().default("Check"),
  type: text("type").notNull().default("Payment"),
  recordedByUserId: text("recorded_by_user_id"),
  recordedByName: text("recorded_by_name").notNull().default("System"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({
  createdAt: true,
});
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
