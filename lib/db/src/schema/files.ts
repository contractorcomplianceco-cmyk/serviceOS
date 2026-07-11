import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

// Metadata for every uploaded file. Binaries live in object storage; this row
// holds the objectPath, validation facts (contentType/size), the owning entity,
// a version number, and the visibility used for download authorization.
export const fileVisibilities = [
  "All Staff",
  "Managers Only",
  "Billing Only",
] as const;
export type FileVisibility = (typeof fileVisibilities)[number];

export const filesTable = pgTable("files", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  objectPath: text("object_path").notNull(),
  name: text("name").notNull(),
  contentType: text("content_type").notNull().default("application/octet-stream"),
  size: integer("size").notNull().default(0),
  entityType: text("entity_type").notNull().default("Misc"),
  entityId: text("entity_id"),
  version: integer("version").notNull().default(1),
  visibility: text("visibility").notNull().default("All Staff"),
  uploadedByUserId: text("uploaded_by_user_id"),
  uploadedByName: text("uploaded_by_name").notNull().default("System"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertFileSchema = createInsertSchema(filesTable).omit({
  createdAt: true,
});
export type InsertFile = z.infer<typeof insertFileSchema>;
export type FileRecord = typeof filesTable.$inferSelect;
