import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export interface EquipmentServiceRecord {
  id: string;
  date: string;
  workOrderId?: string;
  technicianId?: string;
  description: string;
  cost?: number;
}

export interface EquipmentPartRecord {
  id: string;
  date: string;
  itemId?: string;
  name: string;
  quantity: number;
  workOrderId?: string;
}

export interface EquipmentPhoto {
  id: string;
  fileId?: string;
  name: string;
  objectPath?: string;
  uploadedBy: string;
  date: string;
}

// Customer-owned asset registry with full metadata, service/parts history, and
// photos. Extraction candidates live in equipmentExtractionsTable until a human
// approves them into this row.
export const equipmentTable = pgTable("equipment", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  customerId: text("customer_id").notNull(),
  locationId: text("location_id").notNull(),
  assetName: text("asset_name").notNull(),
  manufacturer: text("manufacturer").notNull().default(""),
  model: text("model").notNull().default(""),
  serialNumber: text("serial_number").notNull().default(""),
  category: text("category").notNull().default(""),
  condition: text("condition").notNull().default("Unknown"),
  installDate: text("install_date"),
  warrantyInfo: text("warranty_info").notNull().default(""),
  warrantyExpiration: text("warranty_expiration"),
  lastServiced: text("last_serviced"),
  relatedWorkOrderIds: text("related_work_order_ids")
    .array()
    .notNull()
    .default([]),
  serviceHistory: jsonb("service_history")
    .$type<EquipmentServiceRecord[]>()
    .notNull()
    .default([]),
  partsHistory: jsonb("parts_history")
    .$type<EquipmentPartRecord[]>()
    .notNull()
    .default([]),
  photos: jsonb("photos").$type<EquipmentPhoto[]>().notNull().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertEquipmentSchema = createInsertSchema(equipmentTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Equipment = typeof equipmentTable.$inferSelect;

export const equipmentExtractionStatuses = [
  "Pending Review",
  "Approved",
  "Rejected",
] as const;
export type EquipmentExtractionStatus =
  (typeof equipmentExtractionStatuses)[number];

// Human-in-the-loop document-extraction review. Extraction itself may be
// simulated (and is labeled as such), but the review + persistence is real:
// nothing reaches the equipment record until a human approves.
export const equipmentExtractionsTable = pgTable("equipment_extractions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  equipmentId: text("equipment_id"),
  customerId: text("customer_id"),
  locationId: text("location_id"),
  fileId: text("file_id"),
  sourceName: text("source_name").notNull().default(""),
  simulated: boolean("simulated").notNull().default(true),
  status: text("status").notNull().default("Pending Review"),
  extractedFields: jsonb("extracted_fields")
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  note: text("note"),
  createdByUserId: text("created_by_user_id"),
  createdByName: text("created_by_name").notNull().default("System"),
  reviewedByUserId: text("reviewed_by_user_id"),
  reviewedByName: text("reviewed_by_name"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertEquipmentExtractionSchema = createInsertSchema(
  equipmentExtractionsTable,
).omit({ createdAt: true });
export type InsertEquipmentExtraction = z.infer<
  typeof insertEquipmentExtractionSchema
>;
export type EquipmentExtraction =
  typeof equipmentExtractionsTable.$inferSelect;
