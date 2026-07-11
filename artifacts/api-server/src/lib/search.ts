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

export interface SearchResult {
  entity: string;
  id: string;
  title: string;
  subtitle: string;
  url: string;
  badge: string | null;
}

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

function resultFor(
  entity: SavedListEntity,
  row: Record<string, unknown>,
): SearchResult {
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

const PER_ENTITY_LIMIT = 6;

// Backend global search: runs a substring query per entity the user is allowed
// to see (role + tenant scoped) and returns a flat, capped result list.
export async function globalSearch(
  user: User,
  q: string,
): Promise<SearchResult[]> {
  const query = q.trim();
  if (!query) return [];
  const results: SearchResult[] = [];
  for (const entity of SAVED_LIST_ENTITIES) {
    if (!canQueryEntity(user, entity)) continue;
    const rows = await runEntityQuery(user.tenantId, {
      entity,
      search: query,
    });
    for (const row of rows.slice(0, PER_ENTITY_LIMIT)) {
      results.push(resultFor(entity, row));
    }
  }
  return results;
}
