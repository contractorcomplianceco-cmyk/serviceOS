import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { usersTable } from "./users";

// Per-user grants/denials layered on top of role-based permissions.
export const permissionOverridesTable = pgTable("permission_overrides", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id),
  permissionKey: text("permission_key").notNull(),
  allow: boolean("allow").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertPermissionOverrideSchema = createInsertSchema(
  permissionOverridesTable,
).omit({ createdAt: true });
export type InsertPermissionOverride = z.infer<
  typeof insertPermissionOverrideSchema
>;
export type PermissionOverride = typeof permissionOverridesTable.$inferSelect;
