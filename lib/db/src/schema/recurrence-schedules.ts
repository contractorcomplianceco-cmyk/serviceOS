import {
  integer,
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

// A recurrence schedule defines how a recurring service repeats. The background
// worker reads these and generates due work orders idempotently. Generation is
// never automatic beyond creating a Draft work order — dispatch/scheduling of
// the generated order still requires a human (HITL guardrail).
export const recurrenceFrequencies = [
  "Daily",
  "Weekly",
  "Monthly",
  "Quarterly",
  "SemiAnnual",
  "Annual",
  "Custom",
] as const;
export type RecurrenceFrequency = (typeof recurrenceFrequencies)[number];

export const recurrenceStatuses = ["Active", "Paused", "Ended"] as const;
export type RecurrenceStatus = (typeof recurrenceStatuses)[number];

export const recurrenceSchedulesTable = pgTable("recurrence_schedules", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  contractId: text("contract_id"),
  customerId: text("customer_id").notNull(),
  locationId: text("location_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  workOrderType: text("work_order_type").notNull().default("Maintenance"),
  priority: text("priority").notNull().default("Medium"),
  frequency: text("frequency").notNull().default("Monthly"),
  interval: integer("interval").notNull().default(1),
  // Weekly: weekday numbers 0(Sun)-6(Sat). Monthly: day-of-month numbers 1-31.
  weekdays: jsonb("weekdays").$type<number[]>().notNull().default([]),
  monthDays: jsonb("month_days").$type<number[]>().notNull().default([]),
  blackoutDates: jsonb("blackout_dates").$type<string[]>().notNull().default([]),
  timeWindow: text("time_window"),
  assignedTechnicianId: text("assigned_technician_id"),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }),
  occurrenceLimit: integer("occurrence_limit"),
  occurrencesGenerated: integer("occurrences_generated").notNull().default(0),
  lastGeneratedDate: date("last_generated_date", { mode: "string" }),
  nextRunDate: date("next_run_date", { mode: "string" }),
  status: text("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertRecurrenceScheduleSchema = createInsertSchema(
  recurrenceSchedulesTable,
).omit({ createdAt: true, updatedAt: true });
export type InsertRecurrenceSchedule = z.infer<
  typeof insertRecurrenceScheduleSchema
>;
export type RecurrenceSchedule = typeof recurrenceSchedulesTable.$inferSelect;
