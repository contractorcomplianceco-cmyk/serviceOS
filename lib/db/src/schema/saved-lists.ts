import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

// A saved "smart list" is a persisted, named query over one entity type. It
// stores a structured filter set (not raw SQL) that the backend translates into
// a scoped query at read time, so tenant/role scoping is always re-applied.
export const savedListEntities = [
  "work-orders",
  "customers",
  "invoices",
  "inventory",
  "equipment",
] as const;
export type SavedListEntity = (typeof savedListEntities)[number];

// Visibility controls who can see a saved list:
// - private: only the owner
// - shared: any staff user in the tenant
// - role: only the roles listed in roleRestrictions (plus the owner)
export const savedListVisibilities = ["private", "shared", "role"] as const;
export type SavedListVisibility = (typeof savedListVisibilities)[number];

// A single structured filter clause. Interpreted server-side per entity; never
// executed as raw SQL.
export interface SavedListFilter {
  field: string;
  op:
    | "eq"
    | "neq"
    | "contains"
    | "in"
    | "gt"
    | "lt"
    | "gte"
    | "lte"
    | "is_empty"
    | "not_empty";
  value?: string | number | boolean | string[] | null;
}

export const savedListsTable = pgTable("saved_lists", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  name: text("name").notNull(),
  entity: text("entity").notNull(),
  filters: jsonb("filters").$type<SavedListFilter[]>().notNull().default([]),
  search: text("search"),
  sortField: text("sort_field"),
  sortDir: text("sort_dir").notNull().default("asc"),
  visibility: text("visibility").notNull().default("private"),
  roleRestrictions: jsonb("role_restrictions")
    .$type<string[]>()
    .notNull()
    .default([]),
  ownerUserId: text("owner_user_id").notNull(),
  favorite: boolean("favorite").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  // Seeded regional lists are marked so the demo can distinguish them from
  // user-created lists.
  isSeeded: boolean("is_seeded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertSavedListSchema = createInsertSchema(savedListsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertSavedList = z.infer<typeof insertSavedListSchema>;
export type SavedList = typeof savedListsTable.$inferSelect;
