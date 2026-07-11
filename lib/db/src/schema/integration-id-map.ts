import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

// Maps an external system's ID to a local entity so re-received inbound events
// resolve to the same record (idempotent inbound) and outbound submissions can
// reference the external ID. Unique per (connection, externalId).
export const integrationIdMapTable = pgTable(
  "integration_id_map",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenantsTable.id),
    connectionId: text("connection_id").notNull(),
    externalId: text("external_id").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    connExternalUnique: uniqueIndex("integration_id_map_conn_external_uq").on(
      table.connectionId,
      table.externalId,
    ),
  }),
);

export const insertIntegrationIdMapSchema = createInsertSchema(
  integrationIdMapTable,
).omit({ createdAt: true });
export type InsertIntegrationIdMap = z.infer<
  typeof insertIntegrationIdMapSchema
>;
export type IntegrationIdMap = typeof integrationIdMapTable.$inferSelect;
