import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  recurrenceSchedulesTable,
  recurrenceOccurrencesTable,
  customersTable,
  locationsTable,
  type RecurrenceSchedule,
} from "@workspace/db";
import {
  CreateRecurrenceScheduleBody,
  UpdateRecurrenceScheduleBody,
  UpdateRecurrenceScheduleParams,
  GetRecurrenceScheduleParams,
  ListRecurrenceOccurrencesParams,
  PreviewRecurrenceBody,
  PauseRecurrenceParams,
  ResumeRecurrenceParams,
  EndRecurrenceParams,
  SkipRecurrenceParams,
  RescheduleRecurrenceBody,
  RescheduleRecurrenceParams,
} from "@workspace/api-zod";
import { requireAuth, requireNav } from "../middleware/auth";
import { canManageContracts, canRunRecurrence, isValidRole } from "../lib/authz";
import {
  toRecurrenceSchedule,
  toRecurrenceOccurrence,
} from "../lib/serialize-ops";
import {
  computeOccurrences,
  firstOccurrence,
  nextOccurrenceAfter,
  runRecurrenceForTenant,
  type RecurrenceConfig,
} from "../lib/recurrence";
import { reqDateStr, toDateStr, toDateStrArr } from "../lib/date-input";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

function configOf(s: RecurrenceSchedule): RecurrenceConfig {
  return {
    frequency: s.frequency,
    interval: s.interval,
    weekdays: s.weekdays,
    monthDays: s.monthDays,
    blackoutDates: s.blackoutDates,
    startDate: s.startDate,
    endDate: s.endDate,
    occurrenceLimit: s.occurrenceLimit,
  };
}

async function load(
  tenantId: string,
  id: string,
): Promise<RecurrenceSchedule | undefined> {
  const [row] = await db
    .select()
    .from(recurrenceSchedulesTable)
    .where(
      and(
        eq(recurrenceSchedulesTable.id, id),
        eq(recurrenceSchedulesTable.tenantId, tenantId),
      ),
    );
  return row;
}

function manage(req: import("express").Request): boolean {
  const user = req.user!;
  return isValidRole(user.role) && canManageContracts(user.role);
}

router.get(
  "/recurrence",
  requireAuth,
  requireNav("contracts"),
  async (req, res): Promise<void> => {
    const user = req.user!;
    const rows = await db
      .select()
      .from(recurrenceSchedulesTable)
      .where(eq(recurrenceSchedulesTable.tenantId, user.tenantId))
      .orderBy(recurrenceSchedulesTable.createdAt);
    res.json(rows.reverse().map(toRecurrenceSchedule));
  },
);

// Preview must be registered before "/recurrence/:id" so it isn't shadowed.
router.post(
  "/recurrence/preview",
  requireAuth,
  requireNav("contracts"),
  async (req, res): Promise<void> => {
    const parsed = PreviewRecurrenceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const limit = d.occurrenceLimit ?? undefined;
    const count = Math.min(d.count ?? 12, limit ?? 60);
    const dates = computeOccurrences(
      {
        frequency: d.frequency,
        interval: d.interval ?? 1,
        weekdays: d.weekdays ?? [],
        monthDays: d.monthDays ?? [],
        blackoutDates: toDateStrArr(d.blackoutDates),
        startDate: reqDateStr(d.startDate),
        endDate: toDateStr(d.endDate),
        occurrenceLimit: limit ?? null,
      },
      { count },
    );
    res.json({ dates });
  },
);

router.post(
  "/recurrence/run",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isValidRole(user.role) || !canRunRecurrence(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const result = await runRecurrenceForTenant(user.tenantId);
    res.json(result);
  },
);

router.post(
  "/recurrence",
  requireAuth,
  requireNav("contracts"),
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!manage(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const parsed = CreateRecurrenceScheduleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [customer] = await db
      .select()
      .from(customersTable)
      .where(
        and(
          eq(customersTable.id, d.customerId),
          eq(customersTable.tenantId, user.tenantId),
        ),
      );
    if (!customer) {
      res.status(400).json({ error: "Customer not found" });
      return;
    }
    const [location] = await db
      .select()
      .from(locationsTable)
      .where(
        and(
          eq(locationsTable.id, d.locationId),
          eq(locationsTable.tenantId, user.tenantId),
        ),
      );
    if (!location) {
      res.status(400).json({ error: "Location not found" });
      return;
    }
    const config: RecurrenceConfig = {
      frequency: d.frequency,
      interval: d.interval ?? 1,
      weekdays: d.weekdays ?? [],
      monthDays: d.monthDays ?? [],
      blackoutDates: toDateStrArr(d.blackoutDates),
      startDate: reqDateStr(d.startDate),
      endDate: toDateStr(d.endDate),
      occurrenceLimit: d.occurrenceLimit ?? null,
    };
    const nextRunDate = firstOccurrence(config);
    const [row] = await db
      .insert(recurrenceSchedulesTable)
      .values({
        tenantId: user.tenantId,
        contractId: d.contractId ?? null,
        customerId: d.customerId,
        locationId: d.locationId,
        title: d.title,
        description: d.description ?? null,
        workOrderType: d.workOrderType ?? "Maintenance",
        priority: d.priority ?? "Medium",
        frequency: d.frequency,
        interval: d.interval ?? 1,
        weekdays: config.weekdays,
        monthDays: config.monthDays,
        blackoutDates: config.blackoutDates,
        timeWindow: d.timeWindow ?? null,
        assignedTechnicianId: d.assignedTechnicianId ?? null,
        startDate: config.startDate,
        endDate: config.endDate,
        occurrenceLimit: config.occurrenceLimit,
        nextRunDate,
      })
      .returning();
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Created",
        entityType: "RecurrenceSchedule",
        entityId: row!.id,
        summary: `Recurrence "${d.title}" created (${d.frequency})`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.status(201).json(toRecurrenceSchedule(row!));
  },
);

router.get(
  "/recurrence/:id",
  requireAuth,
  requireNav("contracts"),
  async (req, res): Promise<void> => {
    const user = req.user!;
    const params = GetRecurrenceScheduleParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const row = await load(user.tenantId, params.data.id);
    if (!row) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }
    res.json(toRecurrenceSchedule(row));
  },
);

router.get(
  "/recurrence/:id/occurrences",
  requireAuth,
  requireNav("contracts"),
  async (req, res): Promise<void> => {
    const user = req.user!;
    const params = ListRecurrenceOccurrencesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const schedule = await load(user.tenantId, params.data.id);
    if (!schedule) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }
    const rows = await db
      .select()
      .from(recurrenceOccurrencesTable)
      .where(eq(recurrenceOccurrencesTable.scheduleId, schedule.id))
      .orderBy(recurrenceOccurrencesTable.sequence);
    res.json(rows.map(toRecurrenceOccurrence));
  },
);

router.patch(
  "/recurrence/:id",
  requireAuth,
  requireNav("contracts"),
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!manage(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const params = UpdateRecurrenceScheduleParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = UpdateRecurrenceScheduleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const existing = await load(user.tenantId, params.data.id);
    if (!existing) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }
    const merged: RecurrenceSchedule = {
      ...existing,
      frequency: d.frequency ?? existing.frequency,
      interval: d.interval ?? existing.interval,
      weekdays: d.weekdays ?? existing.weekdays,
      monthDays: d.monthDays ?? existing.monthDays,
      blackoutDates: d.blackoutDates
        ? toDateStrArr(d.blackoutDates)
        : existing.blackoutDates,
      endDate: toDateStr(d.endDate) ?? existing.endDate,
      occurrenceLimit: d.occurrenceLimit ?? existing.occurrenceLimit,
    };
    // Recompute the cursor so timing edits take effect without breaking
    // idempotency: the next run is the first occurrence after the last one we
    // already generated (or the very first if none generated yet).
    const config = configOf(merged);
    const nextRunDate = existing.lastGeneratedDate
      ? nextOccurrenceAfter(config, existing.lastGeneratedDate)
      : firstOccurrence(config);
    const [row] = await db
      .update(recurrenceSchedulesTable)
      .set({
        title: d.title ?? undefined,
        description: d.description ?? undefined,
        workOrderType: d.workOrderType ?? undefined,
        priority: d.priority ?? undefined,
        frequency: d.frequency ?? undefined,
        interval: d.interval ?? undefined,
        weekdays: d.weekdays ?? undefined,
        monthDays: d.monthDays ?? undefined,
        blackoutDates: d.blackoutDates
          ? toDateStrArr(d.blackoutDates)
          : undefined,
        timeWindow: d.timeWindow ?? undefined,
        assignedTechnicianId: d.assignedTechnicianId ?? undefined,
        endDate: toDateStr(d.endDate) ?? undefined,
        occurrenceLimit: d.occurrenceLimit ?? undefined,
        nextRunDate,
      })
      .where(eq(recurrenceSchedulesTable.id, existing.id))
      .returning();
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Updated",
        entityType: "RecurrenceSchedule",
        entityId: existing.id,
        summary: `Recurrence "${row!.title}" updated`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toRecurrenceSchedule(row!));
  },
);

async function transition(
  req: import("express").Request,
  res: import("express").Response,
  id: string,
  apply: (s: RecurrenceSchedule) => Partial<RecurrenceSchedule>,
  action: string,
): Promise<void> {
  const user = req.user!;
  if (!manage(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const existing = await load(user.tenantId, id);
  if (!existing) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  const [row] = await db
    .update(recurrenceSchedulesTable)
    .set(apply(existing))
    .where(eq(recurrenceSchedulesTable.id, existing.id))
    .returning();
  await writeAudit(
    {
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorName: user.name,
      action,
      entityType: "RecurrenceSchedule",
      entityId: existing.id,
      summary: `Recurrence "${row!.title}" ${action.toLowerCase()}`,
      ip: req.ip ?? null,
    },
    req,
  );
  res.json(toRecurrenceSchedule(row!));
}

router.post(
  "/recurrence/:id/pause",
  requireAuth,
  requireNav("contracts"),
  async (req, res): Promise<void> => {
    const params = PauseRecurrenceParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await transition(req, res, params.data.id, () => ({ status: "Paused" }), "Paused");
  },
);

router.post(
  "/recurrence/:id/resume",
  requireAuth,
  requireNav("contracts"),
  async (req, res): Promise<void> => {
    const params = ResumeRecurrenceParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await transition(
      req,
      res,
      params.data.id,
      (s) => {
        const config = configOf(s);
        const nextRunDate = s.lastGeneratedDate
          ? nextOccurrenceAfter(config, s.lastGeneratedDate)
          : firstOccurrence(config);
        return { status: "Active", nextRunDate };
      },
      "Resumed",
    );
  },
);

router.post(
  "/recurrence/:id/end",
  requireAuth,
  requireNav("contracts"),
  async (req, res): Promise<void> => {
    const params = EndRecurrenceParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await transition(
      req,
      res,
      params.data.id,
      () => ({ status: "Ended", nextRunDate: null }),
      "Ended",
    );
  },
);

router.post(
  "/recurrence/:id/skip",
  requireAuth,
  requireNav("contracts"),
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!manage(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const params = SkipRecurrenceParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const existing = await load(user.tenantId, params.data.id);
    if (!existing) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }
    if (!existing.nextRunDate) {
      res.status(400).json({ error: "No upcoming occurrence to skip" });
      return;
    }
    const skipped = existing.nextRunDate;
    const sequence = existing.occurrencesGenerated + 1;
    // Record the skipped occurrence so the worker never generates it, keeping
    // sequence numbering stable (idempotency).
    await db
      .insert(recurrenceOccurrencesTable)
      .values({
        tenantId: user.tenantId,
        scheduleId: existing.id,
        sequence,
        scheduledDate: skipped,
        status: "Skipped",
      })
      .onConflictDoNothing();
    const config = configOf(existing);
    const nextRunDate = nextOccurrenceAfter(config, skipped);
    const [row] = await db
      .update(recurrenceSchedulesTable)
      .set({
        occurrencesGenerated: sequence,
        lastGeneratedDate: skipped,
        nextRunDate,
      })
      .where(eq(recurrenceSchedulesTable.id, existing.id))
      .returning();
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Skipped",
        entityType: "RecurrenceSchedule",
        entityId: existing.id,
        summary: `Recurrence "${row!.title}" occurrence on ${skipped} skipped`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toRecurrenceSchedule(row!));
  },
);

router.post(
  "/recurrence/:id/reschedule",
  requireAuth,
  requireNav("contracts"),
  async (req, res): Promise<void> => {
    const params = RescheduleRecurrenceParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = RescheduleRecurrenceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    await transition(
      req,
      res,
      params.data.id,
      () => ({ nextRunDate: reqDateStr(parsed.data.nextRunDate) }),
      "Rescheduled",
    );
  },
);

export default router;
