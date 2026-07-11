import {
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

// Minimal inventory persistence — only what is needed for deduction-on-approval.
// Full inventory CRUD, transfers, and reservations are a downstream task.
export const inventoryTable = pgTable("inventory", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  name: text("name").notNull(),
  category: text("category").notNull().default(""),
  vendor: text("vendor").notNull().default(""),
  cost: doublePrecision("cost").notNull().default(0),
  billablePrice: doublePrecision("billable_price").notNull().default(0),
  quantity: integer("quantity").notNull().default(0),
  reorderPoint: integer("reorder_point").notNull().default(0),
  compatibleJobTypes: text("compatible_job_types").array().notNull().default([]),
  location: text("location").notNull().default("Tampa Shop"),
  locationDetail: text("location_detail"),
  reservedForJob: text("reserved_for_job"),
  lastUsed: timestamp("last_used", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertInventorySchema = createInsertSchema(inventoryTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventoryTable.$inferSelect;
