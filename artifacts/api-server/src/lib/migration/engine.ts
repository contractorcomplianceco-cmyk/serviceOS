import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  customersTable,
  locationsTable,
  equipmentTable,
  inventoryTable,
  workOrdersTable,
  migrationBatchesTable,
  migrationRowsTable,
  type MigrationBatch,
  type MigrationColumnMap,
  type MigrationEntity,
  type MigrationRowError,
} from "@workspace/db";

// ---------------------------------------------------------------------------
// CSV parsing (RFC-4180-ish: quoted fields, embedded commas/newlines, escaped
// double-quotes). Kept dependency-free.
// ---------------------------------------------------------------------------
export interface ParsedCsv {
  columns: string[];
  rows: Record<string, string>[];
}

export function parseCsv(text: string): ParsedCsv {
  const clean = text.replace(/^\uFEFF/, "");
  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      records.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") {
      // ignore; handled by \n
    } else {
      field += ch;
    }
  }
  // Flush trailing field/row.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }
  const nonEmpty = records.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length === 0) return { columns: [], rows: [] };
  const columns = nonEmpty[0].map((c) => c.trim());
  const rows = nonEmpty.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    columns.forEach((col, idx) => {
      obj[col] = (r[idx] ?? "").trim();
    });
    return obj;
  });
  return { columns, rows };
}

// Produce a CSV string from rows (used for the failed-row export).
export function toCsv(columns: string[], rows: Record<string, string>[]): string {
  const esc = (v: string) =>
    /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const head = columns.map(esc).join(",");
  const body = rows.map((r) => columns.map((c) => esc(r[c] ?? "")).join(","));
  return [head, ...body].join("\n");
}

// ---------------------------------------------------------------------------
// Entity specs: the target fields each migration entity accepts, which are
// required, and their type. Duplicate detection uses the natural key(s).
// ---------------------------------------------------------------------------
export interface FieldSpec {
  target: string;
  required: boolean;
  type: "string" | "number" | "int" | "date" | "email";
  // Human label for the mapping UI.
  label: string;
}

export interface EntitySpec {
  entity: MigrationEntity;
  label: string;
  fields: FieldSpec[];
  // Fields whose combined value identifies a duplicate.
  dedupeFields: string[];
}

export const ENTITY_SPECS: Record<MigrationEntity, EntitySpec> = {
  customers: {
    entity: "customers",
    label: "Customers",
    dedupeFields: ["sourceId", "name"],
    fields: [
      { target: "sourceId", required: false, type: "string", label: "Source ID (BlueFolder ID)" },
      { target: "name", required: true, type: "string", label: "Customer Name" },
      { target: "industry", required: false, type: "string", label: "Industry" },
      { target: "phone", required: false, type: "string", label: "Phone" },
      { target: "email", required: false, type: "email", label: "Email" },
      { target: "status", required: false, type: "string", label: "Status (Active/Inactive)" },
      { target: "taxCode", required: false, type: "string", label: "Tax Code" },
    ],
  },
  locations: {
    entity: "locations",
    label: "Locations / Sites",
    dedupeFields: ["sourceId", "customerRef", "name"],
    fields: [
      { target: "sourceId", required: false, type: "string", label: "Source ID" },
      { target: "customerRef", required: true, type: "string", label: "Customer (ID or Source ID)" },
      { target: "name", required: true, type: "string", label: "Location Name" },
      { target: "address", required: false, type: "string", label: "Address" },
      { target: "city", required: false, type: "string", label: "City" },
      { target: "state", required: false, type: "string", label: "State" },
      { target: "zip", required: false, type: "string", label: "ZIP" },
      { target: "region", required: false, type: "string", label: "Region" },
    ],
  },
  equipment: {
    entity: "equipment",
    label: "Equipment / Assets",
    dedupeFields: ["sourceId", "serialNumber"],
    fields: [
      { target: "sourceId", required: false, type: "string", label: "Source ID" },
      { target: "customerRef", required: true, type: "string", label: "Customer (ID or Source ID)" },
      { target: "locationRef", required: false, type: "string", label: "Location (ID or Source ID)" },
      { target: "assetName", required: true, type: "string", label: "Asset Name" },
      { target: "manufacturer", required: false, type: "string", label: "Manufacturer" },
      { target: "model", required: false, type: "string", label: "Model" },
      { target: "serialNumber", required: false, type: "string", label: "Serial Number" },
      { target: "warrantyInfo", required: false, type: "string", label: "Warranty Info" },
    ],
  },
  inventory: {
    entity: "inventory",
    label: "Inventory / Parts",
    dedupeFields: ["sourceId", "name"],
    fields: [
      { target: "sourceId", required: false, type: "string", label: "Source ID" },
      { target: "name", required: true, type: "string", label: "Item Name" },
      { target: "category", required: false, type: "string", label: "Category" },
      { target: "vendor", required: false, type: "string", label: "Vendor" },
      { target: "cost", required: false, type: "number", label: "Cost" },
      { target: "billablePrice", required: false, type: "number", label: "Billable Price" },
      { target: "quantity", required: false, type: "int", label: "Quantity" },
      { target: "reorderPoint", required: false, type: "int", label: "Reorder Point" },
      { target: "location", required: false, type: "string", label: "Location" },
    ],
  },
  "work-orders": {
    entity: "work-orders",
    label: "Work Orders (core fields)",
    dedupeFields: ["sourceId", "number"],
    fields: [
      { target: "sourceId", required: false, type: "string", label: "Source ID (external)" },
      { target: "number", required: true, type: "string", label: "Work Order Number" },
      { target: "customerRef", required: true, type: "string", label: "Customer (ID or Source ID)" },
      { target: "locationRef", required: true, type: "string", label: "Location (ID or Source ID)" },
      { target: "priority", required: false, type: "string", label: "Priority" },
      { target: "status", required: false, type: "string", label: "Status" },
      { target: "type", required: false, type: "string", label: "Type" },
      { target: "region", required: false, type: "string", label: "Region" },
      { target: "dueDate", required: false, type: "date", label: "Due Date (YYYY-MM-DD)" },
      { target: "description", required: false, type: "string", label: "Description" },
    ],
  },
};

// Apply the batch's column mapping to a raw CSV row → normalized target values.
function mapRow(
  raw: Record<string, string>,
  mapping: MigrationColumnMap[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of mapping) {
    if (!m.source) continue;
    out[m.target] = (raw[m.source] ?? "").trim();
  }
  return out;
}

function validateTypes(
  spec: EntitySpec,
  mapped: Record<string, string>,
): MigrationRowError[] {
  const errors: MigrationRowError[] = [];
  for (const f of spec.fields) {
    const val = mapped[f.target];
    if (f.required && (val === undefined || val === "")) {
      errors.push({ field: f.target, message: `${f.label} is required` });
      continue;
    }
    if (val === undefined || val === "") continue;
    if (f.type === "number" && Number.isNaN(Number(val))) {
      errors.push({ field: f.target, message: `${f.label} must be a number` });
    }
    if (f.type === "int" && !/^-?\d+$/.test(val)) {
      errors.push({ field: f.target, message: `${f.label} must be a whole number` });
    }
    if (f.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) {
      errors.push({ field: f.target, message: `${f.label} must be a valid email` });
    }
    if (f.type === "date" && Number.isNaN(new Date(val).getTime())) {
      errors.push({ field: f.target, message: `${f.label} must be a valid date` });
    }
  }
  return errors;
}

function dedupeSignature(spec: EntitySpec, mapped: Record<string, string>): string {
  // Prefer a source id if present; otherwise fall back to the natural key.
  if (mapped["sourceId"]) return `src:${mapped["sourceId"].toLowerCase()}`;
  const parts = spec.dedupeFields
    .filter((k) => k !== "sourceId")
    .map((k) => (mapped[k] ?? "").toLowerCase());
  return `nat:${parts.join("|")}`;
}

// ---------------------------------------------------------------------------
// Validation (dry-run): reads the batch's rows, applies mapping, type-checks,
// detects duplicates (within the file and against existing data), and writes
// per-row status + errors and a batch summary. Never inserts anything.
// ---------------------------------------------------------------------------
export async function validateBatch(batch: MigrationBatch): Promise<MigrationBatch> {
  const spec = ENTITY_SPECS[batch.entity as MigrationEntity];
  const rows = await db
    .select()
    .from(migrationRowsTable)
    .where(eq(migrationRowsTable.batchId, batch.id));

  // Existing signatures in the destination (duplicate detection against data).
  const existingSigs = await existingSignatures(batch.tenantId, spec);

  const seenInFile = new Set<string>();
  let valid = 0;
  let error = 0;
  let duplicate = 0;

  for (const r of rows) {
    const mapped = mapRow(r.raw, batch.mapping);
    const errors = validateTypes(spec, mapped);
    let status: string;
    if (errors.length > 0) {
      status = "Error";
      error++;
    } else {
      const sig = dedupeSignature(spec, mapped);
      if (seenInFile.has(sig) || existingSigs.has(sig)) {
        status = "Duplicate";
        duplicate++;
      } else {
        seenInFile.add(sig);
        status = "Valid";
        valid++;
      }
    }
    await db
      .update(migrationRowsTable)
      .set({
        mapped,
        status,
        errors,
        sourceId: mapped["sourceId"] || null,
      })
      .where(eq(migrationRowsTable.id, r.id));
  }

  const summary = {
    totalRows: rows.length,
    validRows: valid,
    errorRows: error,
    duplicateRows: duplicate,
    importedRows: 0,
    failedRows: 0,
  };
  const [updated] = await db
    .update(migrationBatchesTable)
    .set({ status: "Validated", summary, dryRun: true })
    .where(eq(migrationBatchesTable.id, batch.id))
    .returning();
  return updated;
}

async function existingSignatures(
  tenantId: string,
  spec: EntitySpec,
): Promise<Set<string>> {
  const sigs = new Set<string>();
  const add = (mapped: Record<string, string>) => sigs.add(dedupeSignature(spec, mapped));
  if (spec.entity === "customers") {
    const rows = await db.select().from(customersTable).where(eq(customersTable.tenantId, tenantId));
    for (const c of rows) add({ name: c.name });
  } else if (spec.entity === "inventory") {
    const rows = await db.select().from(inventoryTable).where(eq(inventoryTable.tenantId, tenantId));
    for (const i of rows) add({ name: i.name });
  } else if (spec.entity === "equipment") {
    const rows = await db.select().from(equipmentTable).where(eq(equipmentTable.tenantId, tenantId));
    for (const e of rows) if (e.serialNumber) add({ serialNumber: e.serialNumber });
  } else if (spec.entity === "locations") {
    const rows = await db.select().from(locationsTable).where(eq(locationsTable.tenantId, tenantId));
    for (const l of rows) add({ customerRef: l.customerId, name: l.name });
  } else if (spec.entity === "work-orders") {
    const rows = await db.select().from(workOrdersTable).where(eq(workOrdersTable.tenantId, tenantId));
    for (const w of rows) {
      if (w.externalId) sigs.add(`src:${w.externalId.toLowerCase()}`);
      add({ number: w.number });
    }
  }
  return sigs;
}

// Resolve a source id to the entity created by a previously-imported migration
// row of the SAME entity type in this tenant. Scoping by entity type prevents
// a source id that overlaps across entities (e.g. a customer and a location
// sharing "1001") from cross-resolving to the wrong entity.
async function resolveBySourceId(
  tenantId: string,
  entity: MigrationEntity,
  sourceId: string,
): Promise<string | null> {
  const [imported] = await db
    .select({ createdEntityId: migrationRowsTable.createdEntityId })
    .from(migrationRowsTable)
    .innerJoin(
      migrationBatchesTable,
      eq(migrationRowsTable.batchId, migrationBatchesTable.id),
    )
    .where(
      and(
        eq(migrationRowsTable.tenantId, tenantId),
        eq(migrationRowsTable.sourceId, sourceId),
        eq(migrationRowsTable.status, "Imported"),
        eq(migrationBatchesTable.entity, entity),
      ),
    )
    .limit(1);
  return imported?.createdEntityId ?? null;
}

// Resolve a customer reference (existing customer id, or a source id from a
// previously-imported customer row in this tenant).
async function resolveCustomer(
  tenantId: string,
  ref: string,
): Promise<string | null> {
  if (!ref) return null;
  const [byId] = await db
    .select()
    .from(customersTable)
    .where(and(eq(customersTable.tenantId, tenantId), eq(customersTable.id, ref)))
    .limit(1);
  if (byId) return byId.id;
  return resolveBySourceId(tenantId, "customers", ref);
}

// Resolve a location reference (existing location id, or a source id from a
// previously-imported location row in this tenant).
async function resolveLocation(
  tenantId: string,
  ref: string,
): Promise<string | null> {
  if (!ref) return null;
  const [byId] = await db
    .select()
    .from(locationsTable)
    .where(and(eq(locationsTable.tenantId, tenantId), eq(locationsTable.id, ref)))
    .limit(1);
  if (byId) return byId.id;
  return resolveBySourceId(tenantId, "locations", ref);
}

// ---------------------------------------------------------------------------
// Execution: inserts the Valid rows for a batch, preserving source IDs, and
// records createdEntityId per row for safe rollback. Skips Error/Duplicate rows.
// ---------------------------------------------------------------------------
export async function executeBatch(batch: MigrationBatch): Promise<MigrationBatch> {
  const spec = ENTITY_SPECS[batch.entity as MigrationEntity];
  const rows = await db
    .select()
    .from(migrationRowsTable)
    .where(
      and(
        eq(migrationRowsTable.batchId, batch.id),
        eq(migrationRowsTable.status, "Valid"),
      ),
    );

  let imported = 0;
  let failed = 0;
  for (const r of rows) {
    const m = r.mapped as Record<string, string>;
    try {
      const createdId = await insertEntity(batch.tenantId, spec.entity, m);
      await db
        .update(migrationRowsTable)
        .set({ status: "Imported", createdEntityId: createdId })
        .where(eq(migrationRowsTable.id, r.id));
      imported++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db
        .update(migrationRowsTable)
        .set({
          status: "Failed",
          errors: [...r.errors, { field: "_row", message }],
        })
        .where(eq(migrationRowsTable.id, r.id));
      failed++;
    }
  }

  const prev = batch.summary ?? {
    totalRows: rows.length,
    validRows: rows.length,
    errorRows: 0,
    duplicateRows: 0,
    importedRows: 0,
    failedRows: 0,
  };
  const summary = { ...prev, importedRows: imported, failedRows: failed };
  const [updated] = await db
    .update(migrationBatchesTable)
    .set({
      status: failed > 0 && imported === 0 ? "Failed" : "Imported",
      summary,
      dryRun: false,
      importedAt: new Date(),
    })
    .where(eq(migrationBatchesTable.id, batch.id))
    .returning();
  return updated;
}

async function insertEntity(
  tenantId: string,
  entity: MigrationEntity,
  m: Record<string, string>,
): Promise<string> {
  if (entity === "customers") {
    const [row] = await db
      .insert(customersTable)
      .values({
        tenantId,
        name: m.name,
        industry: m.industry || "",
        phone: m.phone || "",
        email: m.email || "",
        status: m.status === "Inactive" ? "Inactive" : "Active",
        taxCode: m.taxCode || "",
      })
      .returning();
    return row.id;
  }
  if (entity === "inventory") {
    const [row] = await db
      .insert(inventoryTable)
      .values({
        tenantId,
        name: m.name,
        category: m.category || "",
        vendor: m.vendor || "",
        cost: m.cost ? Number(m.cost) : 0,
        billablePrice: m.billablePrice ? Number(m.billablePrice) : 0,
        quantity: m.quantity ? parseInt(m.quantity, 10) : 0,
        reorderPoint: m.reorderPoint ? parseInt(m.reorderPoint, 10) : 0,
        location: m.location || "Tampa Shop",
      })
      .returning();
    return row.id;
  }
  if (entity === "locations") {
    const customerId = await resolveCustomer(tenantId, m.customerRef);
    if (!customerId) throw new Error(`Customer not found for reference "${m.customerRef}"`);
    const [row] = await db
      .insert(locationsTable)
      .values({
        tenantId,
        customerId,
        name: m.name,
        address: m.address || "",
        city: m.city || "",
        state: m.state || "",
        zip: m.zip || "",
        region: m.region || "",
      })
      .returning();
    return row.id;
  }
  if (entity === "equipment") {
    const customerId = await resolveCustomer(tenantId, m.customerRef);
    if (!customerId) throw new Error(`Customer not found for reference "${m.customerRef}"`);
    let locationId = "";
    if (m.locationRef) {
      const resolved = await resolveLocation(tenantId, m.locationRef);
      if (!resolved) {
        throw new Error(`Location not found for reference "${m.locationRef}"`);
      }
      locationId = resolved;
    }
    const [row] = await db
      .insert(equipmentTable)
      .values({
        tenantId,
        customerId,
        locationId,
        assetName: m.assetName,
        manufacturer: m.manufacturer || "",
        model: m.model || "",
        serialNumber: m.serialNumber || "",
        warrantyInfo: m.warrantyInfo || "",
      })
      .returning();
    return row.id;
  }
  // work-orders
  const customerId = await resolveCustomer(tenantId, m.customerRef);
  if (!customerId) throw new Error(`Customer not found for reference "${m.customerRef}"`);
  const locationId = await resolveLocation(tenantId, m.locationRef);
  if (!locationId) throw new Error(`Location not found for reference "${m.locationRef}"`);
  const [loc] = await db
    .select()
    .from(locationsTable)
    .where(and(eq(locationsTable.tenantId, tenantId), eq(locationsTable.id, locationId)))
    .limit(1);
  const dueDate = m.dueDate
    ? new Date(m.dueDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const [row] = await db
    .insert(workOrdersTable)
    .values({
      tenantId,
      number: m.number,
      source: "Manual",
      customerId,
      locationId,
      externalId: m.sourceId || null,
      priority: m.priority || "Medium",
      status: m.status || "New",
      type: m.type || "",
      region: m.region || loc?.region || "",
      dueDate,
      description: m.description || "",
    })
    .returning();
  return row.id;
}

// ---------------------------------------------------------------------------
// Rollback: deletes the entities created by an Imported batch (newest first),
// marking rows RolledBack. Refuses when a created entity has dependents that
// would be orphaned (e.g. a customer that now has locations/work orders).
// ---------------------------------------------------------------------------
export async function rollbackBatch(batch: MigrationBatch): Promise<MigrationBatch> {
  const spec = ENTITY_SPECS[batch.entity as MigrationEntity];
  const rows = await db
    .select()
    .from(migrationRowsTable)
    .where(
      and(
        eq(migrationRowsTable.batchId, batch.id),
        eq(migrationRowsTable.status, "Imported"),
      ),
    );
  for (const r of rows) {
    if (!r.createdEntityId) continue;
    await deleteEntity(batch.tenantId, spec.entity, r.createdEntityId);
    await db
      .update(migrationRowsTable)
      .set({ status: "RolledBack" })
      .where(eq(migrationRowsTable.id, r.id));
  }
  const [updated] = await db
    .update(migrationBatchesTable)
    .set({ status: "RolledBack", rolledBackAt: new Date() })
    .where(eq(migrationBatchesTable.id, batch.id))
    .returning();
  return updated;
}

async function deleteEntity(
  tenantId: string,
  entity: MigrationEntity,
  id: string,
): Promise<void> {
  if (entity === "customers") {
    const deps = await db
      .select({ id: locationsTable.id })
      .from(locationsTable)
      .where(and(eq(locationsTable.tenantId, tenantId), eq(locationsTable.customerId, id)))
      .limit(1);
    const woDeps = await db
      .select({ id: workOrdersTable.id })
      .from(workOrdersTable)
      .where(and(eq(workOrdersTable.tenantId, tenantId), eq(workOrdersTable.customerId, id)))
      .limit(1);
    if (deps.length > 0 || woDeps.length > 0) {
      throw new Error("Cannot roll back: customer now has locations or work orders");
    }
    await db.delete(customersTable).where(and(eq(customersTable.tenantId, tenantId), eq(customersTable.id, id)));
    return;
  }
  if (entity === "inventory") {
    await db.delete(inventoryTable).where(and(eq(inventoryTable.tenantId, tenantId), eq(inventoryTable.id, id)));
    return;
  }
  if (entity === "locations") {
    const woDeps = await db
      .select({ id: workOrdersTable.id })
      .from(workOrdersTable)
      .where(and(eq(workOrdersTable.tenantId, tenantId), eq(workOrdersTable.locationId, id)))
      .limit(1);
    if (woDeps.length > 0) {
      throw new Error("Cannot roll back: location now has work orders");
    }
    await db.delete(locationsTable).where(and(eq(locationsTable.tenantId, tenantId), eq(locationsTable.id, id)));
    return;
  }
  if (entity === "equipment") {
    await db.delete(equipmentTable).where(and(eq(equipmentTable.tenantId, tenantId), eq(equipmentTable.id, id)));
    return;
  }
  await db.delete(workOrdersTable).where(and(eq(workOrdersTable.tenantId, tenantId), eq(workOrdersTable.id, id)));
}

// Build the failed-row export: every Error/Duplicate/Failed row with its
// original cells plus an appended _errors column.
export async function failedRowsExport(batch: MigrationBatch): Promise<string> {
  const rows = await db
    .select()
    .from(migrationRowsTable)
    .where(
      and(
        eq(migrationRowsTable.batchId, batch.id),
        inArray(migrationRowsTable.status, ["Error", "Duplicate", "Failed"]),
      ),
    );
  const cols = [...batch.sourceColumns, "_status", "_errors"];
  const out = rows.map((r) => {
    const rec: Record<string, string> = { ...r.raw };
    rec["_status"] = r.status;
    rec["_errors"] = r.errors.map((e) => `${e.field}: ${e.message}`).join("; ");
    return rec;
  });
  return toCsv(cols, out);
}
