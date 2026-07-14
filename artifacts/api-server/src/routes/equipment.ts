import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  db,
  equipmentTable,
  equipmentExtractionsTable,
  type Equipment,
  type EquipmentServiceRecord,
  type EquipmentPartRecord,
  type EquipmentPhoto,
} from "@workspace/db";
import {
  CreateEquipmentBody,
  UpdateEquipmentParams,
  UpdateEquipmentBody,
  AddEquipmentServiceRecordParams,
  AddEquipmentServiceRecordBody,
  AddEquipmentPartRecordParams,
  AddEquipmentPartRecordBody,
  AddEquipmentPhotoParams,
  AddEquipmentPhotoBody,
  CreateEquipmentExtractionBody,
  ApproveEquipmentExtractionParams,
  ApproveEquipmentExtractionBody,
  RejectEquipmentExtractionParams,
} from "@workspace/api-zod";
import { requireAuth, requireStaff } from "../middleware/auth";
import { canManageEquipment, isValidRole } from "../lib/authz";
import { toEquipment, toEquipmentExtraction } from "../lib/serialize-ops";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

function requireManage(
  req: import("express").Request,
  res: import("express").Response,
) {
  const user = req.user!;
  if (!isValidRole(user.role) || !canManageEquipment(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return user;
}

async function loadEquipment(
  tenantId: string,
  id: string,
): Promise<Equipment | undefined> {
  const [row] = await db
    .select()
    .from(equipmentTable)
    .where(and(eq(equipmentTable.id, id), eq(equipmentTable.tenantId, tenantId)));
  return row;
}

router.get("/equipment", requireAuth, requireStaff, async (req, res): Promise<void> => {
  const user = req.user!;
  const rows = await db
    .select()
    .from(equipmentTable)
    .where(eq(equipmentTable.tenantId, user.tenantId))
    .orderBy(equipmentTable.assetName);
  res.json(rows.map(toEquipment));
});

router.post("/equipment", requireAuth, async (req, res): Promise<void> => {
  const user = requireManage(req, res);
  if (!user) return;
  const parsed = CreateEquipmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid equipment" });
    return;
  }
  const d = parsed.data;
  const [row] = await db
    .insert(equipmentTable)
    .values({
      tenantId: user.tenantId,
      customerId: d.customerId,
      locationId: d.locationId,
      assetName: d.assetName,
      manufacturer: d.manufacturer ?? "",
      model: d.model ?? "",
      serialNumber: d.serialNumber ?? "",
      category: d.category ?? "",
      condition: d.condition ?? "Unknown",
      installDate: d.installDate ?? null,
      warrantyInfo: d.warrantyInfo ?? "",
      warrantyExpiration: d.warrantyExpiration ?? null,
      notes: d.notes ?? null,
    })
    .returning();
  await writeAudit(
    {
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorName: user.name,
      action: "Equipment Added",
      entityType: "Equipment",
      entityId: row!.id,
      summary: `Added asset ${row!.assetName}`,
      ip: req.ip ?? null,
    },
    req,
  );
  res.json(toEquipment(row!));
});

router.patch("/equipment/:id", requireAuth, async (req, res): Promise<void> => {
  const user = requireManage(req, res);
  if (!user) return;
  const params = UpdateEquipmentParams.safeParse(req.params);
  const parsed = UpdateEquipmentBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid update" });
    return;
  }
  const existing = await loadEquipment(user.tenantId, params.data.id);
  if (!existing) {
    res.status(404).json({ error: "Equipment not found" });
    return;
  }
  const [row] = await db
    .update(equipmentTable)
    .set({ ...parsed.data })
    .where(eq(equipmentTable.id, existing.id))
    .returning();
  await writeAudit(
    {
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorName: user.name,
      action: "Equipment Updated",
      entityType: "Equipment",
      entityId: existing.id,
      summary: `Updated asset ${row!.assetName}`,
      ip: req.ip ?? null,
    },
    req,
  );
  res.json(toEquipment(row!));
});

router.post(
  "/equipment/:id/service",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = requireManage(req, res);
    if (!user) return;
    const params = AddEquipmentServiceRecordParams.safeParse(req.params);
    const parsed = AddEquipmentServiceRecordBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid service record" });
      return;
    }
    const existing = await loadEquipment(user.tenantId, params.data.id);
    if (!existing) {
      res.status(404).json({ error: "Equipment not found" });
      return;
    }
    const d = parsed.data;
    const record: EquipmentServiceRecord = {
      id: randomUUID(),
      date: d.date ?? new Date().toISOString().slice(0, 10),
      workOrderId: d.workOrderId,
      technicianId: d.technicianId,
      description: d.description,
      cost: d.cost,
    };
    const relatedWorkOrderIds =
      d.workOrderId && !existing.relatedWorkOrderIds.includes(d.workOrderId)
        ? [...existing.relatedWorkOrderIds, d.workOrderId]
        : existing.relatedWorkOrderIds;
    const [row] = await db
      .update(equipmentTable)
      .set({
        serviceHistory: [...existing.serviceHistory, record],
        relatedWorkOrderIds,
        lastServiced: record.date,
      })
      .where(eq(equipmentTable.id, existing.id))
      .returning();
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Equipment Serviced",
        entityType: "Equipment",
        entityId: existing.id,
        summary: `${row!.assetName}: ${d.description}`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toEquipment(row!));
  },
);

router.post(
  "/equipment/:id/parts",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = requireManage(req, res);
    if (!user) return;
    const params = AddEquipmentPartRecordParams.safeParse(req.params);
    const parsed = AddEquipmentPartRecordBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid part record" });
      return;
    }
    const existing = await loadEquipment(user.tenantId, params.data.id);
    if (!existing) {
      res.status(404).json({ error: "Equipment not found" });
      return;
    }
    const d = parsed.data;
    const record: EquipmentPartRecord = {
      id: randomUUID(),
      date: d.date ?? new Date().toISOString().slice(0, 10),
      itemId: d.itemId,
      name: d.name,
      quantity: d.quantity,
      workOrderId: d.workOrderId,
    };
    const [row] = await db
      .update(equipmentTable)
      .set({ partsHistory: [...existing.partsHistory, record] })
      .where(eq(equipmentTable.id, existing.id))
      .returning();
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Equipment Part Logged",
        entityType: "Equipment",
        entityId: existing.id,
        summary: `${row!.assetName}: ${d.quantity}× ${d.name}`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toEquipment(row!));
  },
);

router.post(
  "/equipment/:id/photos",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = requireManage(req, res);
    if (!user) return;
    const params = AddEquipmentPhotoParams.safeParse(req.params);
    const parsed = AddEquipmentPhotoBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid photo" });
      return;
    }
    const existing = await loadEquipment(user.tenantId, params.data.id);
    if (!existing) {
      res.status(404).json({ error: "Equipment not found" });
      return;
    }
    const d = parsed.data;
    const photo: EquipmentPhoto = {
      id: randomUUID(),
      fileId: d.fileId,
      name: d.name,
      objectPath: d.objectPath,
      uploadedBy: user.name,
      date: new Date().toISOString(),
    };
    const [row] = await db
      .update(equipmentTable)
      .set({ photos: [...existing.photos, photo] })
      .where(eq(equipmentTable.id, existing.id))
      .returning();
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Equipment Photo Added",
        entityType: "Equipment",
        entityId: existing.id,
        summary: `${row!.assetName}: photo ${d.name}`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toEquipment(row!));
  },
);

// --- Human-in-the-loop document extraction review ---------------------------

router.get(
  "/equipment/extractions",
  requireAuth,
  requireStaff,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const rows = await db
      .select()
      .from(equipmentExtractionsTable)
      .where(eq(equipmentExtractionsTable.tenantId, user.tenantId))
      .orderBy(equipmentExtractionsTable.createdAt);
    res.json(rows.reverse().map(toEquipmentExtraction));
  },
);

router.post(
  "/equipment/extractions",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = requireManage(req, res);
    if (!user) return;
    const parsed = CreateEquipmentExtractionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid extraction" });
      return;
    }
    const d = parsed.data;
    const [row] = await db
      .insert(equipmentExtractionsTable)
      .values({
        tenantId: user.tenantId,
        equipmentId: d.equipmentId ?? null,
        customerId: d.customerId ?? null,
        locationId: d.locationId ?? null,
        fileId: d.fileId ?? null,
        sourceName: d.sourceName,
        // Extraction is simulated in this sprint; the flag makes that explicit
        // in the UI. The review + persistence is real.
        simulated: true,
        status: "Pending Review",
        extractedFields: d.extractedFields ?? {},
        note: d.note ?? null,
        createdByUserId: user.id,
        createdByName: user.name,
      })
      .returning();
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Extraction Created",
        entityType: "EquipmentExtraction",
        entityId: row!.id,
        summary: `Extraction from ${d.sourceName} pending review`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toEquipmentExtraction(row!));
  },
);

router.post(
  "/equipment/extractions/:id/approve",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = requireManage(req, res);
    if (!user) return;
    const params = ApproveEquipmentExtractionParams.safeParse(req.params);
    const parsed = ApproveEquipmentExtractionBody.safeParse(req.body ?? {});
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid approval" });
      return;
    }
    try {
      const out = await db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(equipmentExtractionsTable)
          .where(
            and(
              eq(equipmentExtractionsTable.id, params.data.id),
              eq(equipmentExtractionsTable.tenantId, user.tenantId),
            ),
          )
          .for("update");
        if (!existing) return { notFound: true as const };
        if (existing.status !== "Pending Review") {
          return { bad: `Already ${existing.status}` };
        }
        // Merge reviewer-edited fields over the extracted candidate. This is the
        // human checkpoint — nothing persisted to the asset until here.
        const fields = { ...existing.extractedFields, ...(parsed.data.fields ?? {}) };
        const targetId = parsed.data.equipmentId ?? existing.equipmentId;
        let equipmentId = targetId ?? null;
        if (targetId) {
          const [asset] = await tx
            .select()
            .from(equipmentTable)
            .where(
              and(
                eq(equipmentTable.id, targetId),
                eq(equipmentTable.tenantId, user.tenantId),
              ),
            )
            .for("update");
          if (!asset) return { bad: "Target equipment not found" };
          await tx
            .update(equipmentTable)
            .set({
              assetName: fields.assetName ?? asset.assetName,
              manufacturer: fields.manufacturer ?? asset.manufacturer,
              model: fields.model ?? asset.model,
              serialNumber: fields.serialNumber ?? asset.serialNumber,
              category: fields.category ?? asset.category,
              warrantyInfo: fields.warrantyInfo ?? asset.warrantyInfo,
              warrantyExpiration:
                fields.warrantyExpiration ?? asset.warrantyExpiration,
              installDate: fields.installDate ?? asset.installDate,
            })
            .where(eq(equipmentTable.id, asset.id));
        } else if (existing.customerId && existing.locationId) {
          const [asset] = await tx
            .insert(equipmentTable)
            .values({
              tenantId: user.tenantId,
              customerId: existing.customerId,
              locationId: existing.locationId,
              assetName: fields.assetName ?? existing.sourceName,
              manufacturer: fields.manufacturer ?? "",
              model: fields.model ?? "",
              serialNumber: fields.serialNumber ?? "",
              category: fields.category ?? "",
              warrantyInfo: fields.warrantyInfo ?? "",
              warrantyExpiration: fields.warrantyExpiration ?? null,
              installDate: fields.installDate ?? null,
            })
            .returning();
          equipmentId = asset!.id;
        } else {
          return {
            bad: "Approval requires a target equipmentId or a customer + location",
          };
        }
        const [row] = await tx
          .update(equipmentExtractionsTable)
          .set({
            status: "Approved",
            equipmentId,
            extractedFields: fields,
            reviewedByUserId: user.id,
            reviewedByName: user.name,
            reviewedAt: new Date(),
          })
          .where(eq(equipmentExtractionsTable.id, existing.id))
          .returning();
        return { row: row!, equipmentId };
      });
      if ("notFound" in out) {
        res.status(404).json({ error: "Extraction not found" });
        return;
      }
      if ("bad" in out) {
        res.status(400).json({ error: out.bad });
        return;
      }
      await writeAudit(
        {
          tenantId: user.tenantId,
          actorUserId: user.id,
          actorName: user.name,
          action: "Extraction Approved",
          entityType: "EquipmentExtraction",
          entityId: out.row.id,
          summary: `Approved extraction → equipment ${out.equipmentId}`,
          ip: req.ip ?? null,
        },
        req,
      );
      res.json(toEquipmentExtraction(out.row));
    } catch (err) {
      req.log.error({ err }, "Failed to approve extraction");
      res.status(500).json({ error: "Failed to approve extraction" });
    }
  },
);

router.post(
  "/equipment/extractions/:id/reject",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = requireManage(req, res);
    if (!user) return;
    const params = RejectEquipmentExtractionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [existing] = await db
      .select()
      .from(equipmentExtractionsTable)
      .where(
        and(
          eq(equipmentExtractionsTable.id, params.data.id),
          eq(equipmentExtractionsTable.tenantId, user.tenantId),
        ),
      );
    if (!existing) {
      res.status(404).json({ error: "Extraction not found" });
      return;
    }
    const [row] = await db
      .update(equipmentExtractionsTable)
      .set({
        status: "Rejected",
        reviewedByUserId: user.id,
        reviewedByName: user.name,
        reviewedAt: new Date(),
      })
      .where(eq(equipmentExtractionsTable.id, existing.id))
      .returning();
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Extraction Rejected",
        entityType: "EquipmentExtraction",
        entityId: existing.id,
        summary: `Rejected extraction from ${existing.sourceName}`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toEquipmentExtraction(row!));
  },
);

export default router;
