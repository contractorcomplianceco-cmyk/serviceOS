import {
  boolean,
  date,
  doublePrecision,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const intakeTable = pgTable("intake", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  source: text("source").notNull().default("Manual"),
  customerId: text("customer_id").notNull(),
  locationId: text("location_id"),
  priority: text("priority").notNull().default("Medium"),
  requestedDate: date("requested_date", { mode: "string" }).notNull(),
  // Dispatcher-entered fields that must survive conversion to a work order.
  // Nullable so existing rows remain valid.
  externalId: text("external_id"),
  poNumber: text("po_number"),
  nte: doublePrecision("nte"),
  contact: text("contact"),
  description: text("description").notNull().default(""),
  hasAttachments: boolean("has_attachments").notNull().default(false),
  duplicateOf: text("duplicate_of"),
  missingFields: text("missing_fields").array().notNull().default([]),
  suggestedAction: text("suggested_action").notNull().default(""),
  // Lifecycle: New -> Converted | Dismissed. Guards double-conversion.
  status: text("status").notNull().default("New"),
  convertedWorkOrderId: text("converted_work_order_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertIntakeSchema = createInsertSchema(intakeTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertIntake = z.infer<typeof insertIntakeSchema>;
export type Intake = typeof intakeTable.$inferSelect;
