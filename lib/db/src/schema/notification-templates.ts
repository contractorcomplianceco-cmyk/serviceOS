import {
  boolean,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

// Notification channels. `InApp` is the always-available in-product center;
// Email/SMS/Push are delivered through labeled dev adapters (mail-capture, SMS
// simulator, push placeholder) — nothing is sent to a real provider.
export const notificationChannels = ["InApp", "Email", "SMS", "Push"] as const;
export type NotificationChannel = (typeof notificationChannels)[number];

// The catalog of events the engine can raise. Customer-facing events must go
// through approval before any external channel delivers (HITL guardrail).
export const notificationEventTypes = [
  "work_order.scheduled",
  "work_order.completed",
  "work_order.status_changed",
  "invoice.issued",
  "invoice.past_due",
  "payment.recorded",
  "closeout.submitted",
  "closeout.approved",
  "contract.renewal_due",
  "recurrence.generated",
  "integration.inbound_received",
  "integration.sync_failed",
] as const;
export type NotificationEventType = (typeof notificationEventTypes)[number];

// Templates are per (eventType, channel). Body/subject support {{var}} tokens
// rendered from the event context at dispatch time.
export const notificationTemplatesTable = pgTable(
  "notification_templates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenantsTable.id),
    eventType: text("event_type").notNull(),
    channel: text("channel").notNull(),
    name: text("name").notNull(),
    subject: text("subject"),
    body: text("body").notNull(),
    // Whether this event targets customers. Customer-facing notifications are
    // held for approval before any external channel delivers.
    customerFacing: boolean("customer_facing").notNull().default(false),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    eventChannelUnique: uniqueIndex("notification_template_event_channel_uq").on(
      table.tenantId,
      table.eventType,
      table.channel,
    ),
  }),
);

export const insertNotificationTemplateSchema = createInsertSchema(
  notificationTemplatesTable,
).omit({ createdAt: true, updatedAt: true });
export type InsertNotificationTemplate = z.infer<
  typeof insertNotificationTemplateSchema
>;
export type NotificationTemplate =
  typeof notificationTemplatesTable.$inferSelect;
