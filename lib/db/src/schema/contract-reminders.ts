import {
  pgTable,
  text,
  timestamp,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

// Renewal/expiration reminders emitted by the recurrence worker. Unique per
// (contractId, type) so the worker emits each reminder exactly once.
export const reminderTypes = ["Renewal", "Expiration"] as const;
export type ReminderType = (typeof reminderTypes)[number];

export const reminderStatuses = ["Open", "Dismissed"] as const;
export type ReminderStatus = (typeof reminderStatuses)[number];

export const contractRemindersTable = pgTable(
  "contract_reminders",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenantsTable.id),
    contractId: text("contract_id").notNull(),
    customerId: text("customer_id").notNull(),
    type: text("type").notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("Open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    contractTypeUnique: uniqueIndex("contract_reminder_contract_type_uq").on(
      table.contractId,
      table.type,
    ),
  }),
);

export const insertContractReminderSchema = createInsertSchema(
  contractRemindersTable,
).omit({ createdAt: true });
export type InsertContractReminder = z.infer<
  typeof insertContractReminderSchema
>;
export type ContractReminder = typeof contractRemindersTable.$inferSelect;
