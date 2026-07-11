import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  db,
  intakeTable,
  workOrdersTable,
  customersTable,
  locationsTable,
  type LogEntry,
} from "@workspace/db";
import {
  CreateIntakeBody,
  ConvertIntakeParams,
  DismissIntakeParams,
} from "@workspace/api-zod";
import { requireAuth, requireNav } from "../middleware/auth";
import { toIntake, toWorkOrder } from "../lib/serialize-ops";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

// GET /intake — open intake records for the tenant (New only; converted and
// dismissed items drop off the queue, matching the client behaviour).
router.get(
  "/intake",
  requireAuth,
  requireNav("intake"),
  async (req, res): Promise<void> => {
    const user = req.user!;
    const rows = await db
      .select()
      .from(intakeTable)
      .where(
        and(
          eq(intakeTable.tenantId, user.tenantId),
          eq(intakeTable.status, "New"),
        ),
      )
      .orderBy(intakeTable.createdAt);
    res.json(rows.map(toIntake));
  },
);

// POST /intake — create an intake record.
router.post(
  "/intake",
  requireAuth,
  requireNav("intake"),
  async (req, res): Promise<void> => {
    const parsed = CreateIntakeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const user = req.user!;
    const d = parsed.data;
    const [created] = await db
      .insert(intakeTable)
      .values({
        tenantId: user.tenantId,
        source: d.source ?? undefined,
        customerId: d.customerId,
        locationId: d.locationId ?? null,
        priority: d.priority ?? undefined,
        requestedDate: d.requestedDate,
        description: d.description,
        hasAttachments: d.hasAttachments ?? undefined,
        duplicateOf: d.duplicateOf ?? null,
        missingFields: d.missingFields ?? undefined,
        suggestedAction: d.suggestedAction ?? undefined,
      })
      .returning();

    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Created",
        entityType: "Intake",
        entityId: created.id,
        summary: `Intake captured (${created.source})`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.status(201).json(toIntake(created));
  },
);

// POST /intake/:id/dismiss — remove an item from the queue.
router.post(
  "/intake/:id/dismiss",
  requireAuth,
  requireNav("intake"),
  async (req, res): Promise<void> => {
    const params = DismissIntakeParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const user = req.user!;
    const [item] = await db
      .select()
      .from(intakeTable)
      .where(
        and(
          eq(intakeTable.id, params.data.id),
          eq(intakeTable.tenantId, user.tenantId),
        ),
      );
    if (!item) {
      res.status(404).json({ error: "Intake not found" });
      return;
    }
    if (item.status === "New") {
      await db
        .update(intakeTable)
        .set({ status: "Dismissed" })
        .where(eq(intakeTable.id, item.id));
      await writeAudit(
        {
          tenantId: user.tenantId,
          actorUserId: user.id,
          actorName: user.name,
          action: "Dismissed",
          entityType: "Intake",
          entityId: item.id,
          summary: `Intake dismissed`,
          ip: req.ip ?? null,
        },
        req,
      );
    }
    res.sendStatus(204);
  },
);

// POST /intake/:id/convert — convert to a work order. Idempotent: a second call
// returns the work order created the first time instead of creating a duplicate.
router.post(
  "/intake/:id/convert",
  requireAuth,
  requireNav("intake"),
  async (req, res): Promise<void> => {
    const params = ConvertIntakeParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const user = req.user!;

    try {
      const result = await db.transaction(async (tx) => {
        const [item] = await tx
          .select()
          .from(intakeTable)
          .where(
            and(
              eq(intakeTable.id, params.data.id),
              eq(intakeTable.tenantId, user.tenantId),
            ),
          )
          .for("update");
        if (!item) return { notFound: true as const };

        // Idempotency: already converted → return the existing work order.
        if (item.status === "Converted" && item.convertedWorkOrderId) {
          const [existing] = await tx
            .select()
            .from(workOrdersTable)
            .where(
              and(
                eq(workOrdersTable.id, item.convertedWorkOrderId),
                eq(workOrdersTable.tenantId, user.tenantId),
              ),
            );
          if (existing) return { workOrder: existing, created: false as const };
        }

        const [cust] = await tx
          .select()
          .from(customersTable)
          .where(
            and(
              eq(customersTable.id, item.customerId),
              eq(customersTable.tenantId, user.tenantId),
            ),
          );
        const locs = await tx
          .select()
          .from(locationsTable)
          .where(
            and(
              eq(locationsTable.customerId, item.customerId),
              eq(locationsTable.tenantId, user.tenantId),
            ),
          );
        const loc =
          locs.find((l) => l.id === (item.locationId ?? "")) ?? locs[0];

        const count = await tx
          .select()
          .from(workOrdersTable)
          .where(eq(workOrdersTable.tenantId, user.tenantId));
        const seq = count.length + 1042;

        const note: LogEntry = {
          id: randomUUID(),
          timestamp: new Date().toISOString(),
          author: user.name,
          message: `Converted from ${item.source} intake.`,
        };

        const [wo] = await tx
          .insert(workOrdersTable)
          .values({
            tenantId: user.tenantId,
            number: `WO-2026-${seq}`,
            source: item.source,
            customerId: item.customerId,
            locationId: loc?.id ?? "",
            priority: item.priority,
            status: "Need Scheduled",
            type: "Service",
            region: loc?.region ?? "Tampa",
            dueDate: item.requestedDate,
            billingStatus: "Needs Review",
            description: item.description,
            portalSyncStatus:
              item.source === "Manual" ? "Manual Copy Needed" : "Draft",
            internalLog: [note],
          })
          .returning();

        await tx
          .update(intakeTable)
          .set({ status: "Converted", convertedWorkOrderId: wo.id })
          .where(eq(intakeTable.id, item.id));

        return { workOrder: wo, created: true as const, customerName: cust?.name };
      });

      if ("notFound" in result) {
        res.status(404).json({ error: "Intake not found" });
        return;
      }

      if (result.created) {
        await writeAudit(
          {
            tenantId: user.tenantId,
            actorUserId: user.id,
            actorName: user.name,
            action: "Converted",
            entityType: "Intake",
            entityId: params.data.id,
            summary: `${result.workOrder.source} intake → ${result.workOrder.number} for ${result.customerName ?? "customer"}`,
            ip: req.ip ?? null,
          },
          req,
        );
      }
      res.json(toWorkOrder(result.workOrder));
    } catch (err) {
      req.log.error({ err }, "Failed to convert intake");
      res.status(500).json({ error: "Failed to convert intake" });
    }
  },
);

export default router;
