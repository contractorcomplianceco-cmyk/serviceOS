import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  savedListsTable,
  type SavedList,
  type SavedListFilter,
} from "@workspace/db";
import {
  CreateSavedListBody,
  UpdateSavedListBody,
  PreviewSavedListBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import { isValidRole } from "../lib/authz";
import { toSavedList } from "../lib/serialize-ops";
import {
  SAVED_LIST_ENTITIES,
  canQueryEntity,
  runEntityQuery,
  type Filter,
  type SavedListEntity,
} from "../lib/entity-query";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

// A saved list is visible when: it's yours (private), shared with everyone, or
// restricted to your role.
function canSee(list: SavedList, user: import("@workspace/db").User): boolean {
  if (list.ownerUserId === user.id) return true;
  if (list.visibility === "shared") return true;
  if (list.visibility === "role") return list.roleRestrictions.includes(user.role);
  return false;
}

function isEntity(v: string): v is SavedListEntity {
  return (SAVED_LIST_ENTITIES as string[]).includes(v);
}

router.get(
  "/saved-lists",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const entity = typeof req.query.entity === "string" ? req.query.entity : undefined;
    const rows = await db
      .select()
      .from(savedListsTable)
      .where(eq(savedListsTable.tenantId, user.tenantId))
      .orderBy(savedListsTable.sortOrder);
    const visible = rows
      .filter((l) => canSee(l, user))
      .filter((l) => (entity ? l.entity === entity : true));
    res.json(visible.map(toSavedList));
  },
);

router.post(
  "/saved-lists/preview",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const parsed = PreviewSavedListBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    if (!isEntity(d.entity) || !canQueryEntity(user, d.entity)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const items = await runEntityQuery(user.tenantId, {
      entity: d.entity,
      filters: (d.filters ?? []) as Filter[],
      search: d.search ?? null,
      sortField: d.sortField ?? null,
      sortDir: d.sortDir ?? "asc",
    });
    res.json({ entity: d.entity, count: items.length, items });
  },
);

router.post(
  "/saved-lists",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const parsed = CreateSavedListBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    if (!isEntity(d.entity) || !canQueryEntity(user, d.entity)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const [row] = await db
      .insert(savedListsTable)
      .values({
        tenantId: user.tenantId,
        name: d.name,
        entity: d.entity,
        filters: (d.filters ?? []) as unknown as SavedListFilter[],
        search: d.search ?? null,
        sortField: d.sortField ?? null,
        sortDir: d.sortDir ?? "asc",
        visibility: d.visibility ?? "private",
        roleRestrictions: d.roleRestrictions ?? [],
        ownerUserId: user.id,
        favorite: d.favorite ?? false,
      })
      .returning();
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Created",
        entityType: "SavedList",
        entityId: row!.id,
        summary: `Smart list "${d.name}" created`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.status(201).json(toSavedList(row!));
  },
);

async function loadOwned(
  user: import("@workspace/db").User,
  id: string,
): Promise<SavedList | undefined> {
  const [row] = await db
    .select()
    .from(savedListsTable)
    .where(
      and(
        eq(savedListsTable.id, id),
        eq(savedListsTable.tenantId, user.tenantId),
      ),
    );
  return row;
}

router.patch(
  "/saved-lists/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const parsed = UpdateSavedListBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const existing = await loadOwned(user, String(req.params.id));
    if (!existing) {
      res.status(404).json({ error: "Saved list not found" });
      return;
    }
    // Only the owner may edit a saved list (seeded lists included).
    if (existing.ownerUserId !== user.id && !(isValidRole(user.role) && user.role === "Administrator")) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const d = parsed.data;
    const [row] = await db
      .update(savedListsTable)
      .set({
        name: d.name ?? undefined,
        filters: d.filters
          ? (d.filters as unknown as SavedListFilter[])
          : undefined,
        search: d.search === undefined ? undefined : d.search,
        sortField: d.sortField === undefined ? undefined : d.sortField,
        sortDir: d.sortDir ?? undefined,
        visibility: d.visibility ?? undefined,
        roleRestrictions: d.roleRestrictions ?? undefined,
        favorite: d.favorite ?? undefined,
        sortOrder: d.sortOrder ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(savedListsTable.id, existing.id))
      .returning();
    res.json(toSavedList(row!));
  },
);

router.delete(
  "/saved-lists/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const existing = await loadOwned(user, String(req.params.id));
    if (!existing) {
      res.status(404).json({ error: "Saved list not found" });
      return;
    }
    if (existing.ownerUserId !== user.id && !(isValidRole(user.role) && user.role === "Administrator")) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    await db.delete(savedListsTable).where(eq(savedListsTable.id, existing.id));
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Deleted",
        entityType: "SavedList",
        entityId: existing.id,
        summary: `Smart list "${existing.name}" deleted`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.status(204).end();
  },
);

router.post(
  "/saved-lists/:id/run",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const existing = await loadOwned(user, String(req.params.id));
    if (!existing || !canSee(existing, user)) {
      res.status(404).json({ error: "Saved list not found" });
      return;
    }
    if (!isEntity(existing.entity) || !canQueryEntity(user, existing.entity)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const items = await runEntityQuery(user.tenantId, {
      entity: existing.entity,
      filters: existing.filters as Filter[],
      search: existing.search,
      sortField: existing.sortField,
      sortDir: existing.sortDir === "desc" ? "desc" : "asc",
    });
    res.json({ entity: existing.entity, count: items.length, items });
  },
);

export default router;
