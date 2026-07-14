import {
  boolean,
  date,
  doublePrecision,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export interface Trip {
  id: string;
  tripNumber: number;
  technicianId?: string;
  date: string;
  managerOnSite?: string;
  checkIn?: string;
  checkOut?: string;
  workPerformed?: string;
  returnTripReason?: string;
  materialsNeeded?: string;
  checkInLat?: number;
  checkInLng?: number;
  checkOutLat?: number;
  checkOutLng?: number;
}

export interface LaborEntry {
  id: string;
  technicianId: string;
  date: string;
  hours: number;
  rate: number;
  type: "Standard" | "After Hours" | "Travel";
  approved: boolean;
}

export interface MaterialEntry {
  id: string;
  inventoryItemId?: string;
  name: string;
  quantity: number;
  cost: number;
  billablePrice: number;
  approved: boolean;
}

export interface ExpenseEntry {
  id: string;
  description: string;
  amount: number;
  category: string;
  approved: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  type: "Photo" | "PDF" | "Document";
  uploadedBy: string;
  date: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  author: string;
  message: string;
}

export interface StatusHistoryEntry {
  status: string;
  at: string;
  by: string;
}

export const workOrdersTable = pgTable("work_orders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  number: text("number").notNull(),
  source: text("source").notNull().default("Manual"),
  customerId: text("customer_id").notNull(),
  locationId: text("location_id").notNull(),
  poNumber: text("po_number"),
  referenceNumber: text("reference_number"),
  externalId: text("external_id"),
  nte: doublePrecision("nte"),
  contact: text("contact"),
  priority: text("priority").notNull().default("Medium"),
  status: text("status").notNull().default("New"),
  type: text("type").notNull().default(""),
  region: text("region").notNull().default(""),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  billingStatus: text("billing_status").notNull().default("Needs Review"),
  accountManagerId: text("account_manager_id"),
  serviceManagerId: text("service_manager_id"),
  assignedTechnicianId: text("assigned_technician_id"),
  timeWindow: text("time_window"),
  scheduledStart: timestamp("scheduled_start", { withTimezone: true }),
  scheduledEnd: timestamp("scheduled_end", { withTimezone: true }),
  scheduleApprovedBy: text("schedule_approved_by"),
  scheduleApprovedAt: timestamp("schedule_approved_at", { withTimezone: true }),
  description: text("description").notNull().default(""),
  importantNotes: text("important_notes"),
  locationNotes: text("location_notes"),
  quoteNotes: text("quote_notes"),
  portalSyncStatus: text("portal_sync_status").notNull().default("Draft"),
  materialsFlag: boolean("materials_flag"),
  quoteFlag: boolean("quote_flag"),
  trips: jsonb("trips").$type<Trip[]>().notNull().default([]),
  labor: jsonb("labor").$type<LaborEntry[]>().notNull().default([]),
  materials: jsonb("materials").$type<MaterialEntry[]>().notNull().default([]),
  expenses: jsonb("expenses").$type<ExpenseEntry[]>().notNull().default([]),
  attachments: jsonb("attachments").$type<Attachment[]>().notNull().default([]),
  internalLog: jsonb("internal_log").$type<LogEntry[]>().notNull().default([]),
  statusHistory: jsonb("status_history")
    .$type<StatusHistoryEntry[]>()
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

export const insertWorkOrderSchema = createInsertSchema(workOrdersTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type WorkOrder = typeof workOrdersTable.$inferSelect;
