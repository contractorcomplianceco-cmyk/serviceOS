import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, locationsTable, type Location } from "@workspace/db";
import {
  CreateLocationBody,
  UpdateLocationBody,
  UpdateLocationParams,
} from "@workspace/api-zod";
import { requireAuth, requireNav } from "../middleware/auth";
import { toLocation } from "../lib/serialize-ops";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

// GET /locations — tenant-scoped list.
router.get(
  "/locations",
  requireAuth,
  requireNav("locations"),
  async (req, res): Promise<void> => {
    const user = req.user!;
    const rows = await db
      .select()
      .from(locationsTable)
      .where(eq(locationsTable.tenantId, user.tenantId))
      .orderBy(locationsTable.name);
    res.json(rows.map(toLocation));
  },
);

// POST /locations — create a location.
router.post(
  "/locations",
  requireAuth,
  requireNav("locations"),
  async (req, res): Promise<void> => {
    const parsed = CreateLocationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const user = req.user!;
    const d = parsed.data;
    const [created] = await db
      .insert(locationsTable)
      .values({
        tenantId: user.tenantId,
        customerId: d.customerId,
        name: d.name,
        address: d.address ?? undefined,
        city: d.city ?? undefined,
        state: d.state ?? undefined,
        zip: d.zip ?? undefined,
        region: d.region ?? undefined,
        notes: d.notes ?? undefined,
      })
      .returning();

    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Created",
        entityType: "Location",
        entityId: created.id,
        summary: `Location ${created.name} created`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.status(201).json(toLocation(created));
  },
);

// PATCH /locations/:id — update a location.
router.patch(
  "/locations/:id",
  requireAuth,
  requireNav("locations"),
  async (req, res): Promise<void> => {
    const params = UpdateLocationParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateLocationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const user = req.user!;
    const [target] = await db
      .select()
      .from(locationsTable)
      .where(
        and(
          eq(locationsTable.id, params.data.id),
          eq(locationsTable.tenantId, user.tenantId),
        ),
      );
    if (!target) {
      res.status(404).json({ error: "Location not found" });
      return;
    }

    const d = parsed.data;
    const updates: Partial<Location> = {};
    if (d.name !== undefined) updates.name = d.name;
    if (d.address !== undefined) updates.address = d.address;
    if (d.city !== undefined) updates.city = d.city;
    if (d.state !== undefined) updates.state = d.state;
    if (d.zip !== undefined) updates.zip = d.zip;
    if (d.region !== undefined) updates.region = d.region;
    if (d.notes !== undefined) updates.notes = d.notes;

    const [updated] = await db
      .update(locationsTable)
      .set(updates)
      .where(eq(locationsTable.id, target.id))
      .returning();

    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Updated",
        entityType: "Location",
        entityId: target.id,
        summary: `Location ${updated.name} updated`,
        metadata: { fields: Object.keys(updates) },
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toLocation(updated));
  },
);

export default router;
