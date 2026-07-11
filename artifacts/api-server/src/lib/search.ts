import type { User } from "@workspace/db";
import {
  SAVED_LIST_ENTITIES,
  canQueryEntity,
  runEntityQuery,
  type SavedListEntity,
} from "./entity-query";

function money(n: number): string {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface BaseResult {
  entity: string;
  id: string;
  title: string;
  subtitle: string;
  url: string;
  badge: string | null;
}

export interface SearchResult extends BaseResult {
  titleHtml: string;
  subtitleHtml: string;
}

export interface SearchGroup {
  entity: string;
  label: string;
  total: number;
  results: SearchResult[];
}

export interface SearchResponse {
  query: string;
  page: number;
  pageSize: number;
  total: number;
  groups: SearchGroup[];
}

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

function resultFor(
  entity: SavedListEntity,
  row: Record<string, unknown>,
): BaseResult {
  const id = str(row.id);
  switch (entity) {
    case "work-orders":
      return {
        entity: "work-order",
        id,
        title: `WO ${str(row.number)}`,
        subtitle: str(row.description).slice(0, 80),
        url: `/work-orders/${id}`,
        badge: str(row.status),
      };
    case "customers":
      return {
        entity: "customer",
        id,
        title: str(row.name),
        subtitle: [str(row.industry), str(row.phone)].filter(Boolean).join(" · "),
        url: `/customers/${id}`,
        badge: str(row.status),
      };
    case "invoices":
      return {
        entity: "invoice",
        id,
        title: `Invoice ${str(row.number)}`,
        subtitle: money(Number(row.amount) || 0),
        url: `/billing`,
        badge: str(row.status),
      };
    case "inventory":
      return {
        entity: "inventory",
        id,
        title: str(row.name),
        subtitle: [str(row.category), str(row.location)]
          .filter(Boolean)
          .join(" · "),
        url: `/inventory`,
        badge: `${str(row.quantity)} on hand`,
      };
    case "equipment":
      return {
        entity: "equipment",
        id,
        title: str(row.assetName),
        subtitle: [str(row.manufacturer), str(row.model)]
          .filter(Boolean)
          .join(" · "),
        url: `/equipment`,
        badge: str(row.serialNumber) || null,
      };
  }
}

const ENTITY_INFO: Record<SavedListEntity, { entity: string; label: string }> = {
  "work-orders": { entity: "work-order", label: "Work Orders" },
  customers: { entity: "customer", label: "Customers" },
  invoices: { entity: "invoice", label: "Invoices" },
  inventory: { entity: "inventory", label: "Inventory" },
  equipment: { entity: "equipment", label: "Equipment" },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Escape first, then wrap the (case-insensitive) matched substring in <mark>.
function highlight(text: string, q: string): string {
  if (!text) return "";
  if (!q) return escapeHtml(text);
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return escapeHtml(text);
  const before = escapeHtml(text.slice(0, idx));
  const match = escapeHtml(text.slice(idx, idx + q.length));
  const after = escapeHtml(text.slice(idx + q.length));
  return `${before}<mark>${match}</mark>${after}`;
}

// Backend global search: runs a substring query per entity the user is allowed
// to see (role + tenant scoped), grouping results by entity with per-group
// totals, page-sliced results, and server-side match highlighting.
export async function globalSearch(
  user: User,
  q: string,
  page = 1,
  pageSize = 5,
): Promise<SearchResponse> {
  const query = q.trim();
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safeSize = Math.min(50, Math.max(1, Math.floor(pageSize) || 5));
  if (!query) {
    return { query, page: safePage, pageSize: safeSize, total: 0, groups: [] };
  }
  const groups: SearchGroup[] = [];
  let total = 0;
  for (const entity of SAVED_LIST_ENTITIES) {
    if (!canQueryEntity(user, entity)) continue;
    const rows = await runEntityQuery(user.tenantId, {
      entity,
      search: query,
    });
    if (rows.length === 0) continue;
    total += rows.length;
    const info = ENTITY_INFO[entity];
    const start = (safePage - 1) * safeSize;
    const slice = rows.slice(start, start + safeSize);
    const results: SearchResult[] = slice.map((row) => {
      const base = resultFor(entity, row);
      return {
        ...base,
        titleHtml: highlight(base.title, query),
        subtitleHtml: highlight(base.subtitle, query),
      };
    });
    groups.push({
      entity: info.entity,
      label: info.label,
      total: rows.length,
      results,
    });
  }
  return { query, page: safePage, pageSize: safeSize, total, groups };
}
