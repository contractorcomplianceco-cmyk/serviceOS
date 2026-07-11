import { eq } from "drizzle-orm";
import {
  db,
  workOrdersTable,
  customersTable,
  invoicesTable,
  inventoryTable,
  equipmentTable,
  type User,
} from "@workspace/db";
import {
  toWorkOrder,
  toCustomer,
  toInvoice,
  toInventoryItem,
  toEquipment,
} from "./serialize-ops";
import { hasNavAccess, isValidRole, type NavKey } from "./authz";

export type SavedListEntity =
  | "work-orders"
  | "customers"
  | "invoices"
  | "inventory"
  | "equipment";

export const SAVED_LIST_ENTITIES: SavedListEntity[] = [
  "work-orders",
  "customers",
  "invoices",
  "inventory",
  "equipment",
];

// Each list/search entity maps to the nav permission that governs access to it,
// so a role that cannot see billing cannot query invoices via a saved list or
// global search.
export const ENTITY_NAV: Record<SavedListEntity, NavKey> = {
  "work-orders": "work-orders",
  customers: "customers",
  invoices: "billing",
  inventory: "inventory",
  equipment: "equipment",
};

export function canQueryEntity(user: User, entity: SavedListEntity): boolean {
  return isValidRole(user.role) && hasNavAccess(user.role, ENTITY_NAV[entity]);
}

export interface Filter {
  field: string;
  op: string;
  value?: unknown;
}

// Fetch all rows for an entity within the tenant, serialized to plain objects.
export async function fetchEntityRows(
  tenantId: string,
  entity: SavedListEntity,
): Promise<Record<string, unknown>[]> {
  switch (entity) {
    case "work-orders": {
      const rows = await db
        .select()
        .from(workOrdersTable)
        .where(eq(workOrdersTable.tenantId, tenantId));
      return rows.map((r) => toWorkOrder(r) as unknown as Record<string, unknown>);
    }
    case "customers": {
      const rows = await db
        .select()
        .from(customersTable)
        .where(eq(customersTable.tenantId, tenantId));
      return rows.map((r) => toCustomer(r) as unknown as Record<string, unknown>);
    }
    case "invoices": {
      const rows = await db
        .select()
        .from(invoicesTable)
        .where(eq(invoicesTable.tenantId, tenantId));
      return rows.map((r) => toInvoice(r) as unknown as Record<string, unknown>);
    }
    case "inventory": {
      const rows = await db
        .select()
        .from(inventoryTable)
        .where(eq(inventoryTable.tenantId, tenantId));
      return rows.map(
        (r) => toInventoryItem(r) as unknown as Record<string, unknown>,
      );
    }
    case "equipment": {
      const rows = await db
        .select()
        .from(equipmentTable)
        .where(eq(equipmentTable.tenantId, tenantId));
      return rows.map((r) => toEquipment(r) as unknown as Record<string, unknown>);
    }
  }
}

function asString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

function matchesFilter(row: Record<string, unknown>, f: Filter): boolean {
  const raw = row[f.field];
  const s = asString(raw).toLowerCase();
  const target = f.value;
  switch (f.op) {
    case "eq":
      return s === asString(target).toLowerCase();
    case "neq":
      return s !== asString(target).toLowerCase();
    case "contains":
      return s.includes(asString(target).toLowerCase());
    case "in":
      return Array.isArray(target)
        ? target.map((t) => asString(t).toLowerCase()).includes(s)
        : false;
    case "gt":
      return Number(raw) > Number(target);
    case "lt":
      return Number(raw) < Number(target);
    case "gte":
      return Number(raw) >= Number(target);
    case "lte":
      return Number(raw) <= Number(target);
    case "is_empty":
      return s === "";
    case "not_empty":
      return s !== "";
    default:
      return true;
  }
}

// Broad substring match across an entity's most relevant text fields.
const SEARCH_FIELDS: Record<SavedListEntity, string[]> = {
  "work-orders": ["number", "description", "status", "priority", "type", "region"],
  customers: ["name", "industry", "phone", "email", "status"],
  invoices: ["number", "status"],
  inventory: ["name", "category", "vendor", "location"],
  equipment: ["assetName", "manufacturer", "model", "serialNumber", "category"],
};

function matchesSearch(
  row: Record<string, unknown>,
  entity: SavedListEntity,
  q: string,
): boolean {
  const needle = q.toLowerCase();
  return SEARCH_FIELDS[entity].some((f) =>
    asString(row[f]).toLowerCase().includes(needle),
  );
}

export interface RunQuery {
  entity: SavedListEntity;
  filters?: Filter[];
  search?: string | null;
  sortField?: string | null;
  sortDir?: "asc" | "desc";
}

export async function runEntityQuery(
  tenantId: string,
  q: RunQuery,
): Promise<Record<string, unknown>[]> {
  let rows = await fetchEntityRows(tenantId, q.entity);
  for (const f of q.filters ?? []) {
    rows = rows.filter((r) => matchesFilter(r, f));
  }
  if (q.search && q.search.trim()) {
    rows = rows.filter((r) => matchesSearch(r, q.entity, q.search!.trim()));
  }
  if (q.sortField) {
    const field = q.sortField;
    const dir = q.sortDir === "desc" ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      const an = Number(av);
      const bn = Number(bv);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return (an - bn) * dir;
      return asString(av).localeCompare(asString(bv)) * dir;
    });
  }
  return rows;
}
