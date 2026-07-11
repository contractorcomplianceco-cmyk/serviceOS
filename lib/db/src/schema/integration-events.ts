import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

// One row per inbound or outbound sync attempt. This single table is the sync
// history, the outbound approval queue, and the failed-jobs list. Outbound
// events that touch customers are held at PendingApproval until a human
// approves (HITL guardrail — nothing auto-sends externally).
export const integrationDirections = ["Inbound", "Outbound"] as const;
export type IntegrationDirection = (typeof integrationDirections)[number];

export const integrationEventStatuses = [
  "Received",
  "Mapped",
  "PendingApproval",
  "Approved",
  "Submitted",
  "Failed",
  "Retrying",
  "Rejected",
  "Ignored",
] as const;
export type IntegrationEventStatus =
  (typeof integrationEventStatuses)[number];

export interface IntegrationStatusEvent {
  at: string;
  status: IntegrationEventStatus;
  detail: string;
}

export const integrationEventsTable = pgTable("integration_events", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  connectionId: text("connection_id").notNull(),
  direction: text("direction").notNull(),
  eventType: text("event_type").notNull(),
  externalId: text("external_id"),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  status: text("status").notNull().default("Received"),
  requiresApproval: text("requires_approval").notNull().default("false"),
  approvedByUserId: text("approved_by_user_id"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  mappedPayload: jsonb("mapped_payload").$type<Record<string, unknown>>(),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  statusHistory: jsonb("status_history")
    .$type<IntegrationStatusEvent[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertIntegrationEventSchema = createInsertSchema(
  integrationEventsTable,
).omit({ createdAt: true, updatedAt: true });
export type InsertIntegrationEvent = z.infer<
  typeof insertIntegrationEventSchema
>;
export type IntegrationEvent = typeof integrationEventsTable.$inferSelect;
