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

// Per-recipient opt-in/out for an (eventType, channel). A missing row means the
// channel default applies. Scope is either a staff user or a customer.
export const notificationPreferenceScopes = ["user", "customer"] as const;
export type NotificationPreferenceScope =
  (typeof notificationPreferenceScopes)[number];

export const notificationPreferencesTable = pgTable(
  "notification_preferences",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenantsTable.id),
    scope: text("scope").notNull(),
    // Exactly one of these is set depending on scope.
    userId: text("user_id"),
    customerId: text("customer_id"),
    eventType: text("event_type").notNull(),
    channel: text("channel").notNull(),
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
    prefUnique: uniqueIndex("notification_preference_uq").on(
      table.tenantId,
      table.scope,
      table.userId,
      table.customerId,
      table.eventType,
      table.channel,
    ),
  }),
);

export const insertNotificationPreferenceSchema = createInsertSchema(
  notificationPreferencesTable,
).omit({ createdAt: true, updatedAt: true });
export type InsertNotificationPreference = z.infer<
  typeof insertNotificationPreferenceSchema
>;
export type NotificationPreference =
  typeof notificationPreferencesTable.$inferSelect;
