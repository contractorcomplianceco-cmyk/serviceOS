import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

// A single notification record doubles as the delivery job and the in-app
// center row. Status advances through the delivery lifecycle; statusHistory
// keeps an append-only audit of every transition and attempt.
export const notificationStatuses = [
  "Queued",
  "PendingApproval",
  "Approved",
  "Sending",
  "Sent",
  "Failed",
  "Cancelled",
  "Suppressed",
] as const;
export type NotificationStatus = (typeof notificationStatuses)[number];

export const notificationRecipientTypes = ["user", "customer"] as const;
export type NotificationRecipientType =
  (typeof notificationRecipientTypes)[number];

export interface NotificationStatusEvent {
  at: string;
  status: NotificationStatus;
  detail: string;
}

export const notificationsTable = pgTable("notifications", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  eventType: text("event_type").notNull(),
  channel: text("channel").notNull(),
  templateId: text("template_id"),
  recipientType: text("recipient_type").notNull(),
  recipientUserId: text("recipient_user_id"),
  recipientCustomerId: text("recipient_customer_id"),
  // Email address / phone / device token; null for in-app.
  recipientAddress: text("recipient_address"),
  subject: text("subject"),
  body: text("body").notNull(),
  status: text("status").notNull().default("Queued"),
  // Customer-facing notifications require approval before any external channel
  // delivers. Staff/in-app notifications skip approval.
  requiresApproval: text("requires_approval").notNull().default("false"),
  approvedByUserId: text("approved_by_user_id"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  lastError: text("last_error"),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
  statusHistory: jsonb("status_history")
    .$type<NotificationStatusEvent[]>()
    .notNull()
    .default([]),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: text("related_entity_id"),
  // In-app center read state.
  readAt: timestamp("read_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertNotificationSchema = createInsertSchema(
  notificationsTable,
).omit({ createdAt: true, updatedAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
