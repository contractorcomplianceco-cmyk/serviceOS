import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

// A reusable column-mapping template for the CSV migration center. Maps source
// CSV headers to target entity fields so a repeat import of the same export
// format can skip the manual mapping step.
export interface MigrationColumnMap {
  // Target entity field name.
  target: string;
  // Source CSV column header (or null if intentionally unmapped).
  source: string | null;
}

export const migrationTemplatesTable = pgTable("migration_templates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  name: text("name").notNull(),
  entity: text("entity").notNull(),
  mapping: jsonb("mapping").$type<MigrationColumnMap[]>().notNull().default([]),
  createdByUserId: text("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertMigrationTemplateSchema = createInsertSchema(
  migrationTemplatesTable,
).omit({ createdAt: true, updatedAt: true });
export type InsertMigrationTemplate = z.infer<
  typeof insertMigrationTemplateSchema
>;
export type MigrationTemplate = typeof migrationTemplatesTable.$inferSelect;
