import {
  boolean,
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

export const ROLES = [
  "Administrator",
  "Service Manager",
  "Scheduler",
  "Supervisor",
  "Lead Technician",
  "Technician",
  "Billing",
  "Bookkeeper",
  "Inventory Manager",
  "Sales",
  "Subcontractor",
  "Customer Portal User",
] as const;

export type Role = (typeof ROLES)[number];

export const usersTable = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(),

  // Authentication
  passwordHash: text("password_hash"),
  passwordAlgo: text("password_algo").notNull().default("argon2id"),
  active: boolean("active").notNull().default(true),
  mustResetPassword: boolean("must_reset_password").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  mfaSecret: text("mfa_secret"),
  failedLoginCount: integer("failed_login_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),

  // Customer-portal scoping: portal users are bound to a single customer.
  customerId: text("customer_id"),

  // Employee profile (mirrors the frontend User type)
  phone: text("phone"),
  zone: text("zone"),
  skills: text("skills").array(),
  restrictedTasks: text("restricted_tasks").array(),
  workloadHours: doublePrecision("workload_hours"),
  capacityHours: doublePrecision("capacity_hours"),
  truckId: text("truck_id"),
  gpsConsent: boolean("gps_consent"),
  hourlyCost: doublePrecision("hourly_cost"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
