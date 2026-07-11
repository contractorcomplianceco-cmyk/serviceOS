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

// A service contract ties a customer to negotiated rates + recurring service.
// Renewal/expiration reminders are emitted by the recurrence worker.
export const contractStatuses = [
  "Active",
  "Paused",
  "Ended",
  "Expired",
] as const;
export type ContractStatus = (typeof contractStatuses)[number];

export const serviceContractsTable = pgTable("service_contracts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  customerId: text("customer_id").notNull(),
  locationId: text("location_id"),
  name: text("name").notNull(),
  description: text("description"),
  laborRate: doublePrecision("labor_rate"),
  afterHoursRate: doublePrecision("after_hours_rate"),
  value: doublePrecision("value"),
  includedServices: jsonb("included_services")
    .$type<string[]>()
    .notNull()
    .default([]),
  coveredEquipmentIds: jsonb("covered_equipment_ids")
    .$type<string[]>()
    .notNull()
    .default([]),
  startDate: date("start_date", { mode: "string" }).notNull(),
  renewalDate: date("renewal_date", { mode: "string" }).notNull(),
  status: text("status").notNull().default("Active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertServiceContractSchema = createInsertSchema(
  serviceContractsTable,
).omit({ createdAt: true, updatedAt: true });
export type InsertServiceContract = z.infer<
  typeof insertServiceContractSchema
>;
export type ServiceContract = typeof serviceContractsTable.$inferSelect;
