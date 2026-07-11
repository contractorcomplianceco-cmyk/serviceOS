import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  db,
  workOrdersTable,
  inventoryTable,
  type WorkOrder,
  type LaborEntry,
  type MaterialEntry,
  type LogEntry,
  type Trip,
  type ExpenseEntry,
  type Attachment,
  type StatusHistoryEntry,
} from "@workspace/db";
import {
  CreateWorkOrderBody,
  UpdateWorkOrderBody,
  UpdateWorkOrderParams,
  GetWorkOrderParams,
  AddLaborEntryBody,
  AddLaborEntryParams,
  AddMaterialEntryBody,
  AddMaterialEntryParams,
  AddWorkOrderNoteBody,
  AddWorkOrderNoteParams,
  TechnicianCheckInBody,
  TechnicianCheckInParams,
  TechnicianCheckOutBody,
  TechnicianCheckOutParams,
} from "@workspace/api-zod";
import { requireAuth, requireNav, requireRoles } from "../middleware/auth";
import { canSchedule, isValidRole } from "../lib/authz";
import { toWorkOrder } from "../lib/serialize-ops";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

async function loadWorkOrder(
  id: string,
  tenantId: string,
): Promise<WorkOrder | undefined> {
  const [wo] = await db
    .select()
    .from(workOrdersTable)
    .where(and(eq(workOrdersTable.id, id), eq(workOrdersTable.tenantId, tenantId)));
  return wo;
}

// GET /work-orders — tenant-scoped list.
router.get(
  "/work-orders",
  requireAuth,
  requireNav("work-orders"),
  async (req, res): Promise<void> => {
    const user = req.user!;
    const rows = await db
      .select()
      .from(workOrdersTable)
      .where(eq(workOrdersTable.tenantId, user.tenantId))
      .orderBy(workOrdersTable.createdAt);
    res.json(rows.map(toWorkOrder));
  },
);

// GET /work-orders/:id
router.get(
  "/work-orders/:id",
  requireAuth,
  requireNav("work-orders"),
  async (req, res): Promise<void> => {
    const params = GetWorkOrderParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const user = req.user!;
    const wo = await loadWorkOrder(params.data.id, user.tenantId);
    if (!wo) {
      res.status(404).json({ error: "Work order not found" });
      return;
    }
    res.json(toWorkOrder(wo));
  },
);

// POST /work-orders — create a work order.
router.post(
  "/work-orders",
  requireAuth,
  requireNav("work-orders"),
  async (req, res): Promise<void> => {
    const parsed = CreateWorkOrderBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const user = req.user!;
    const d = parsed.data;

    let number = d.number;
    if (!number) {
      const existing = await db
        .select()
        .from(workOrdersTable)
        .where(eq(workOrdersTable.tenantId, user.tenantId));
      number = `WO-2026-${existing.length + 1042}`;
    }

    const [created] = await db
      .insert(workOrdersTable)
      .values({
        tenantId: user.tenantId,
        number,
        source: d.source ?? undefined,
        customerId: d.customerId,
        locationId: d.locationId,
        poNumber: d.poNumber ?? null,
        referenceNumber: d.referenceNumber ?? null,
        externalId: d.externalId ?? null,
        priority: d.priority ?? undefined,
        status: d.status ?? undefined,
        type: d.type ?? undefined,
        region: d.region ?? undefined,
        dueDate: d.dueDate ?? new Date().toISOString().slice(0, 10),
        billingStatus: d.billingStatus ?? undefined,
        accountManagerId: d.accountManagerId ?? null,
        serviceManagerId: d.serviceManagerId ?? null,
        assignedTechnicianId: d.assignedTechnicianId ?? null,
        timeWindow: d.timeWindow ?? null,
        description: d.description,
        importantNotes: d.importantNotes ?? null,
        locationNotes: d.locationNotes ?? null,
        quoteNotes: d.quoteNotes ?? null,
        portalSyncStatus: d.portalSyncStatus ?? undefined,
        materialsFlag: d.materialsFlag ?? null,
        quoteFlag: d.quoteFlag ?? null,
      })
      .returning();

    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Created",
        entityType: "WorkOrder",
        entityId: created.id,
        summary: `${created.number} created (${created.source})`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.status(201).json(toWorkOrder(created));
  },
);

// PATCH /work-orders/:id — update. Scheduling transitions require scheduling
// authority: moving a work order to "Scheduled" or setting a schedule window is
// a human decision the backend enforces (RoseOS never auto-schedules).
router.patch(
  "/work-orders/:id",
  requireAuth,
  requireNav("work-orders"),
  async (req, res): Promise<void> => {
    const params = UpdateWorkOrderParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateWorkOrderBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const user = req.user!;
    const wo = await loadWorkOrder(params.data.id, user.tenantId);
    if (!wo) {
      res.status(404).json({ error: "Work order not found" });
      return;
    }

    const d = parsed.data;
    const isScheduling =
      (d.status === "Scheduled" && wo.status !== "Scheduled") ||
      d.scheduledStart !== undefined;
    if (isScheduling && !(isValidRole(user.role) && canSchedule(user.role))) {
      res.status(403).json({
        error: "Scheduling requires scheduling authority",
      });
      return;
    }

    const updates: Partial<WorkOrder> = {};
    if (d.number !== undefined) updates.number = d.number;
    if (d.source !== undefined) updates.source = d.source;
    if (d.customerId !== undefined) updates.customerId = d.customerId;
    if (d.locationId !== undefined) updates.locationId = d.locationId;
    if (d.poNumber !== undefined) updates.poNumber = d.poNumber;
    if (d.referenceNumber !== undefined)
      updates.referenceNumber = d.referenceNumber;
    if (d.externalId !== undefined) updates.externalId = d.externalId;
    if (d.priority !== undefined) updates.priority = d.priority;
    if (d.status !== undefined) updates.status = d.status;
    if (d.type !== undefined) updates.type = d.type;
    if (d.region !== undefined) updates.region = d.region;
    if (d.dueDate !== undefined) updates.dueDate = d.dueDate;
    if (d.billingStatus !== undefined) updates.billingStatus = d.billingStatus;
    if (d.accountManagerId !== undefined)
      updates.accountManagerId = d.accountManagerId;
    if (d.serviceManagerId !== undefined)
      updates.serviceManagerId = d.serviceManagerId;
    if (d.assignedTechnicianId !== undefined)
      updates.assignedTechnicianId = d.assignedTechnicianId;
    if (d.timeWindow !== undefined) updates.timeWindow = d.timeWindow;
    if (d.scheduledStart !== undefined)
      updates.scheduledStart = d.scheduledStart ? new Date(d.scheduledStart) : null;
    if (d.scheduledEnd !== undefined)
      updates.scheduledEnd = d.scheduledEnd ? new Date(d.scheduledEnd) : null;
    if (d.description !== undefined) updates.description = d.description;
    if (d.importantNotes !== undefined)
      updates.importantNotes = d.importantNotes;
    if (d.locationNotes !== undefined) updates.locationNotes = d.locationNotes;
    if (d.quoteNotes !== undefined) updates.quoteNotes = d.quoteNotes;
    if (d.portalSyncStatus !== undefined)
      updates.portalSyncStatus = d.portalSyncStatus;
    if (d.materialsFlag !== undefined) updates.materialsFlag = d.materialsFlag;
    if (d.quoteFlag !== undefined) updates.quoteFlag = d.quoteFlag;
    if (d.trips !== undefined) updates.trips = d.trips as Trip[];
    if (d.labor !== undefined) updates.labor = d.labor as LaborEntry[];
    if (d.materials !== undefined)
      updates.materials = d.materials as MaterialEntry[];
    if (d.expenses !== undefined)
      updates.expenses = d.expenses as ExpenseEntry[];
    if (d.attachments !== undefined)
      updates.attachments = d.attachments as Attachment[];
    if (d.internalLog !== undefined)
      updates.internalLog = d.internalLog as LogEntry[];
    if (d.statusHistory !== undefined)
      updates.statusHistory = d.statusHistory as StatusHistoryEntry[];

    if (isScheduling) {
      updates.scheduleApprovedBy = user.id;
      updates.scheduleApprovedAt = new Date();
    }

    const [updated] = await db
      .update(workOrdersTable)
      .set(updates)
      .where(eq(workOrdersTable.id, wo.id))
      .returning();

    const summaryBits: string[] = [];
    if (d.status && d.status !== wo.status)
      summaryBits.push(`status → ${d.status}`);
    if (
      d.assignedTechnicianId &&
      d.assignedTechnicianId !== wo.assignedTechnicianId
    )
      summaryBits.push(`assigned to ${d.assignedTechnicianId}`);
    if (d.billingStatus && d.billingStatus !== wo.billingStatus)
      summaryBits.push(`billing → ${d.billingStatus}`);
    if (isScheduling) summaryBits.push("scheduled");
    // Every actual mutation is audited. Notable field changes get a descriptive
    // summary; any other edit falls back to a generic "fields updated" entry so
    // no backend mutation goes unrecorded.
    if (Object.keys(updates).length) {
      const summary = summaryBits.length
        ? summaryBits.join(", ")
        : `${Object.keys(updates).length} field(s) updated`;
      await writeAudit(
        {
          tenantId: user.tenantId,
          actorUserId: user.id,
          actorName: user.name,
          action: isScheduling ? "Scheduled" : "Updated",
          entityType: "WorkOrder",
          entityId: wo.id,
          summary: `${updated.number}: ${summary}`,
          ip: req.ip ?? null,
        },
        req,
      );
    }
    res.json(toWorkOrder(updated));
  },
);

// POST /work-orders/:id/labor — append a labor entry.
router.post(
  "/work-orders/:id/labor",
  requireAuth,
  requireNav("work-orders"),
  async (req, res): Promise<void> => {
    const params = AddLaborEntryParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = AddLaborEntryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const user = req.user!;
    const wo = await loadWorkOrder(params.data.id, user.tenantId);
    if (!wo) {
      res.status(404).json({ error: "Work order not found" });
      return;
    }
    const d = parsed.data;
    const entry: LaborEntry = {
      id: randomUUID(),
      technicianId: d.technicianId,
      date: d.date ?? new Date().toISOString(),
      hours: d.hours,
      rate: d.rate,
      type: (d.type as LaborEntry["type"]) ?? "Standard",
      approved: d.approved ?? false,
    };
    const [updated] = await db
      .update(workOrdersTable)
      .set({ labor: [...wo.labor, entry] })
      .where(eq(workOrdersTable.id, wo.id))
      .returning();

    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Added Labor",
        entityType: "WorkOrder",
        entityId: wo.id,
        summary: `${wo.number}: ${entry.hours}h ${entry.type}`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toWorkOrder(updated));
  },
);

// POST /work-orders/:id/materials — append a material entry; deduct from stock
// when linked to an inventory item.
router.post(
  "/work-orders/:id/materials",
  requireAuth,
  requireNav("work-orders"),
  async (req, res): Promise<void> => {
    const params = AddMaterialEntryParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = AddMaterialEntryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const user = req.user!;
    const d = parsed.data;

    try {
      const result = await db.transaction(async (tx) => {
        const [wo] = await tx
          .select()
          .from(workOrdersTable)
          .where(
            and(
              eq(workOrdersTable.id, params.data.id),
              eq(workOrdersTable.tenantId, user.tenantId),
            ),
          )
          .for("update");
        if (!wo) return { notFound: true as const };

        let cost = d.cost ?? 0;
        let billablePrice = d.billablePrice ?? 0;
        let name = d.name;
        if (d.inventoryItemId) {
          const [item] = await tx
            .select()
            .from(inventoryTable)
            .where(
              and(
                eq(inventoryTable.id, d.inventoryItemId),
                eq(inventoryTable.tenantId, user.tenantId),
              ),
            )
            .for("update");
          if (item) {
            if (d.cost === undefined) cost = item.cost;
            if (d.billablePrice === undefined) billablePrice = item.billablePrice;
            name = item.name;
            await tx
              .update(inventoryTable)
              .set({
                quantity: Math.max(0, item.quantity - d.quantity),
                lastUsed: new Date(),
              })
              .where(eq(inventoryTable.id, item.id));
          }
        }

        const entry: MaterialEntry = {
          id: randomUUID(),
          inventoryItemId: d.inventoryItemId ?? undefined,
          name,
          quantity: d.quantity,
          cost,
          billablePrice,
          approved: d.approved ?? false,
        };
        const [updated] = await tx
          .update(workOrdersTable)
          .set({ materials: [...wo.materials, entry] })
          .where(eq(workOrdersTable.id, wo.id))
          .returning();
        return { wo, updated, entry };
      });

      if ("notFound" in result) {
        res.status(404).json({ error: "Work order not found" });
        return;
      }

      await writeAudit(
        {
          tenantId: user.tenantId,
          actorUserId: user.id,
          actorName: user.name,
          action: "Added Material",
          entityType: "WorkOrder",
          entityId: result.wo.id,
          summary: `${result.wo.number}: ${result.entry.quantity}× ${result.entry.name}`,
          ip: req.ip ?? null,
        },
        req,
      );
      if (result.entry.inventoryItemId) {
        await writeAudit(
          {
            tenantId: user.tenantId,
            actorUserId: user.id,
            actorName: user.name,
            action: "Consumed",
            entityType: "Inventory",
            entityId: result.entry.inventoryItemId,
            summary: `-${result.entry.quantity} ${result.entry.name} (${result.wo.number})`,
            ip: req.ip ?? null,
          },
          req,
        );
      }
      res.json(toWorkOrder(result.updated));
    } catch (err) {
      req.log.error({ err }, "Failed to add material");
      res.status(500).json({ error: "Failed to add material" });
    }
  },
);

// POST /work-orders/:id/notes — append an internal log note.
router.post(
  "/work-orders/:id/notes",
  requireAuth,
  requireNav("work-orders"),
  async (req, res): Promise<void> => {
    const params = AddWorkOrderNoteParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = AddWorkOrderNoteBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const user = req.user!;
    const wo = await loadWorkOrder(params.data.id, user.tenantId);
    if (!wo) {
      res.status(404).json({ error: "Work order not found" });
      return;
    }
    const note: LogEntry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      author: user.name,
      message: parsed.data.message,
    };
    const [updated] = await db
      .update(workOrdersTable)
      .set({ internalLog: [...wo.internalLog, note] })
      .where(eq(workOrdersTable.id, wo.id))
      .returning();

    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Note Added",
        entityType: "WorkOrder",
        entityId: wo.id,
        summary: `${wo.number}: note added`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toWorkOrder(updated));
  },
);

// POST /work-orders/:id/check-in — technician opens a trip (captures GPS).
router.post(
  "/work-orders/:id/check-in",
  requireAuth,
  requireRoles("Technician", "Lead Technician", "Subcontractor"),
  async (req, res): Promise<void> => {
    const params = TechnicianCheckInParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = TechnicianCheckInBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const user = req.user!;
    const wo = await loadWorkOrder(params.data.id, user.tenantId);
    if (!wo) {
      res.status(404).json({ error: "Work order not found" });
      return;
    }
    const nowIso = new Date().toISOString();
    const d = parsed.data;
    const trip: Trip = {
      id: randomUUID(),
      tripNumber: (wo.trips[wo.trips.length - 1]?.tripNumber ?? 0) + 1,
      technicianId: wo.assignedTechnicianId ?? user.id,
      date: nowIso,
      checkIn: nowIso,
      ...(d.lat !== undefined ? { checkInLat: d.lat } : {}),
      ...(d.lng !== undefined ? { checkInLng: d.lng } : {}),
    };
    const [updated] = await db
      .update(workOrdersTable)
      .set({ status: "On Site", trips: [...wo.trips, trip] })
      .where(eq(workOrdersTable.id, wo.id))
      .returning();

    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Checked In",
        entityType: "WorkOrder",
        entityId: wo.id,
        summary: `${wo.number}: technician on site`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toWorkOrder(updated));
  },
);

// POST /work-orders/:id/check-out — technician closes the open trip (GPS).
router.post(
  "/work-orders/:id/check-out",
  requireAuth,
  requireRoles("Technician", "Lead Technician", "Subcontractor"),
  async (req, res): Promise<void> => {
    const params = TechnicianCheckOutParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = TechnicianCheckOutBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const user = req.user!;
    const wo = await loadWorkOrder(params.data.id, user.tenantId);
    if (!wo) {
      res.status(404).json({ error: "Work order not found" });
      return;
    }
    const nowIso = new Date().toISOString();
    const d = parsed.data;
    const lastIdx = wo.trips.length - 1;
    const trips = wo.trips.length
      ? wo.trips.map((t, i) =>
          i === lastIdx
            ? {
                ...t,
                checkOut: nowIso,
                workPerformed: d.workPerformed ?? t.workPerformed,
                ...(d.lat !== undefined ? { checkOutLat: d.lat } : {}),
                ...(d.lng !== undefined ? { checkOutLng: d.lng } : {}),
              }
            : t,
        )
      : wo.trips;
    const [updated] = await db
      .update(workOrdersTable)
      .set({ trips })
      .where(eq(workOrdersTable.id, wo.id))
      .returning();

    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Checked Out",
        entityType: "WorkOrder",
        entityId: wo.id,
        summary: `${wo.number}: technician checked out`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toWorkOrder(updated));
  },
);

export default router;
