import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

// The kinds of external systems this app can integrate with. Every adapter
// shares one interface (connect/authenticate/refresh/inbound/fetch/map/submit/
// retry/record/disconnect). None are live — see `state`/`environment`.
export const integrationProviders = [
  "ServiceChannel",
  "EmailIntake",
  "GenericPortal",
  "VoiceConnect",
  "Routing",
] as const;
export type IntegrationProvider = (typeof integrationProviders)[number];

// Explicit connection state machine. "Simulated" and "Sandbox" are the only
// states that actually process traffic in this prototype; "Connected" is
// reserved for real credentials (never reached here).
export const integrationStates = [
  "NotConnected",
  "ConfigurationRequired",
  "Simulated",
  "Sandbox",
  "Connected",
  "Error",
  "Disabled",
] as const;
export type IntegrationState = (typeof integrationStates)[number];

export const integrationEnvironments = [
  "Simulation",
  "Sandbox",
  "Production",
] as const;
export type IntegrationEnvironment = (typeof integrationEnvironments)[number];

export const integrationConnectionsTable = pgTable("integration_connections", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  provider: text("provider").notNull(),
  name: text("name").notNull(),
  state: text("state").notNull().default("NotConnected"),
  environment: text("environment").notNull().default("Simulation"),
  // Field-mapping config and non-secret settings. Real secrets are never stored
  // here in the prototype — tokenHint is a masked placeholder only.
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  tokenHint: text("token_hint"),
  lastInboundAt: timestamp("last_inbound_at", { withTimezone: true }),
  lastOutboundAt: timestamp("last_outbound_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertIntegrationConnectionSchema = createInsertSchema(
  integrationConnectionsTable,
).omit({ createdAt: true, updatedAt: true });
export type InsertIntegrationConnection = z.infer<
  typeof insertIntegrationConnectionSchema
>;
export type IntegrationConnection =
  typeof integrationConnectionsTable.$inferSelect;
