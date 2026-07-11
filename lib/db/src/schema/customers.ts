import {
  doublePrecision,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export interface Contact {
  id: string;
  name: string;
  title: string;
  phone: string;
  email: string;
  primary?: boolean;
}

export interface RateRule {
  id: string;
  label: string;
  laborRate: number;
  afterHoursRate: number;
  notes?: string;
}

export const customersTable = pgTable("customers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  name: text("name").notNull(),
  industry: text("industry").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  status: text("status").notNull().default("Active"),
  accountManagerId: text("account_manager_id").notNull().default(""),
  tags: text("tags").array().notNull().default([]),
  contacts: jsonb("contacts").$type<Contact[]>().notNull().default([]),
  rateRules: jsonb("rate_rules").$type<RateRule[]>().notNull().default([]),
  requirements: text("requirements").array().notNull().default([]),
  portalRules: text("portal_rules").notNull().default(""),
  taxCode: text("tax_code").notNull().default(""),
  balance: doublePrecision("balance").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
