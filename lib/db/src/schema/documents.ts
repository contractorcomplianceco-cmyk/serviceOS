import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

// Permissioned, versioned document vault. A document is the logical record
// (name/type/visibility/expiration); each upload is an immutable version that
// points at a file. Expiration reminders are persisted as their own records.
export const documentsTable = pgTable("documents", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  customerId: text("customer_id"),
  name: text("name").notNull(),
  type: text("type").notNull().default("Contract"),
  visibility: text("visibility").notNull().default("All Staff"),
  expiration: text("expiration"),
  currentVersion: integer("current_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type DocumentRecord = typeof documentsTable.$inferSelect;

export const documentVersionsTable = pgTable("document_versions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  documentId: text("document_id")
    .notNull()
    .references(() => documentsTable.id),
  version: integer("version").notNull(),
  fileId: text("file_id"),
  notes: text("notes"),
  uploadedByUserId: text("uploaded_by_user_id"),
  uploadedByName: text("uploaded_by_name").notNull().default("System"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertDocumentVersionSchema = createInsertSchema(
  documentVersionsTable,
).omit({ createdAt: true });
export type InsertDocumentVersion = z.infer<
  typeof insertDocumentVersionSchema
>;
export type DocumentVersion = typeof documentVersionsTable.$inferSelect;

export const documentReminderStatuses = [
  "Pending",
  "Sent",
  "Dismissed",
] as const;
export type DocumentReminderStatus =
  (typeof documentReminderStatuses)[number];

export const documentRemindersTable = pgTable("document_reminders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  documentId: text("document_id")
    .notNull()
    .references(() => documentsTable.id),
  remindAt: text("remind_at").notNull(),
  reason: text("reason").notNull().default(""),
  status: text("status").notNull().default("Pending"),
  createdByUserId: text("created_by_user_id"),
  createdByName: text("created_by_name").notNull().default("System"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertDocumentReminderSchema = createInsertSchema(
  documentRemindersTable,
).omit({ createdAt: true });
export type InsertDocumentReminder = z.infer<
  typeof insertDocumentReminderSchema
>;
export type DocumentReminder = typeof documentRemindersTable.$inferSelect;
