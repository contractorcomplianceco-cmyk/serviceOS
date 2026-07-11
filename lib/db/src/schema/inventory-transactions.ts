import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { inventoryTable } from "./inventory";

// Immutable inventory ledger. Every stock change is an append-only transaction;
// on-hand and reserved balances are DERIVED by summing these rows. Never mutate
// or delete a transaction — corrections are new offsetting transactions.
//
// Sign conventions (see server reducer):
// - quantity is the signed on-hand delta applied at `location`.
//   opening/receipt/return: +N; consumption: -N; adjustment/cycle_count: +/-N.
// - transfer/assign: quantity = -N at `location`; `toLocation` receives +N.
// - reservation/release: quantity = 0; `reservedDelta` carries +N / -N at `location`.
export const inventoryTxnTypes = [
  "opening",
  "receipt",
  "transfer",
  "assign",
  "reservation",
  "release",
  "consumption",
  "return",
  "adjustment",
  "cycle_count",
] as const;
export type InventoryTxnType = (typeof inventoryTxnTypes)[number];

export const inventoryTransactionsTable = pgTable("inventory_transactions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  itemId: text("item_id")
    .notNull()
    .references(() => inventoryTable.id),
  type: text("type").notNull(),
  quantity: integer("quantity").notNull().default(0),
  reservedDelta: integer("reserved_delta").notNull().default(0),
  location: text("location").notNull(),
  toLocation: text("to_location"),
  workOrderId: text("work_order_id"),
  purchaseRequestId: text("purchase_request_id"),
  reason: text("reason"),
  overridden: boolean("overridden").notNull().default(false),
  actorUserId: text("actor_user_id"),
  actorName: text("actor_name").notNull().default("System"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertInventoryTransactionSchema = createInsertSchema(
  inventoryTransactionsTable,
).omit({ createdAt: true });
export type InsertInventoryTransaction = z.infer<
  typeof insertInventoryTransactionSchema
>;
export type InventoryTransaction =
  typeof inventoryTransactionsTable.$inferSelect;
