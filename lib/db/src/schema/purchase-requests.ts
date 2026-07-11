import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

// Reorder / purchase requests with a human approval + receiving lifecycle.
// Receiving posts a `receipt` inventory transaction into the ledger.
export const purchaseRequestStatuses = [
  "Requested",
  "Approved",
  "Ordered",
  "Received",
  "Cancelled",
] as const;
export type PurchaseRequestStatus = (typeof purchaseRequestStatuses)[number];

export const purchaseRequestsTable = pgTable("purchase_requests", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  itemId: text("item_id").notNull(),
  itemName: text("item_name"),
  vendor: text("vendor"),
  quantity: integer("quantity").notNull(),
  location: text("location"),
  status: text("status").notNull().default("Requested"),
  reason: text("reason"),
  requestedByUserId: text("requested_by_user_id"),
  requestedByName: text("requested_by_name").notNull().default("System"),
  approvedByUserId: text("approved_by_user_id"),
  approvedByName: text("approved_by_name"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  receivedByUserId: text("received_by_user_id"),
  receivedByName: text("received_by_name"),
  receivedAt: timestamp("received_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertPurchaseRequestSchema = createInsertSchema(
  purchaseRequestsTable,
).omit({ createdAt: true, updatedAt: true });
export type InsertPurchaseRequest = z.infer<
  typeof insertPurchaseRequestSchema
>;
export type PurchaseRequest = typeof purchaseRequestsTable.$inferSelect;
