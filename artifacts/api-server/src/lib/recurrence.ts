import { and, eq } from "drizzle-orm";
import {
  db,
  recurrenceSchedulesTable,
  recurrenceOccurrencesTable,
  serviceContractsTable,
  contractRemindersTable,
  documentsTable,
  documentRemindersTable,
  workOrdersTable,
  type RecurrenceSchedule,
} from "@workspace/db";
import { writeAudit } from "./audit";

// ---------------------------------------------------------------------------
// Pure date math (UTC-only, YYYY-MM-DD strings) — deterministic so the worker
// is idempotent given an unchanged schedule config.
// ---------------------------------------------------------------------------

const MS_DAY = 86_400_000;

export interface RecurrenceConfig {
  frequency: string;
  interval: number;
  weekdays: number[];
  monthDays: number[];
  blackoutDates: string[];
  startDate: string;
  endDate?: string | null;
  occurrenceLimit?: number | null;
}

function parse(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}
function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MS_DAY);
}
function addMonths(d: Date, n: number): Date {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + n;
  return new Date(Date.UTC(year, month, 1));
}
function daysInMonth(year: number, monthIdx: number): number {
  return new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
}
function startOfWeek(d: Date): Date {
  // Week starts Sunday (getUTCDay 0=Sun).
  return addDays(d, -d.getUTCDay());
}

// Base month step for the monthly-family frequencies. `interval` multiplies it.
function monthStepFor(frequency: string): number | null {
  switch (frequency) {
    case "Monthly":
      return 1;
    case "Quarterly":
      return 3;
    case "SemiAnnual":
      return 6;
    case "Annual":
      return 12;
    default:
      return null;
  }
}

const MAX_ITERATIONS = 6000;

/**
 * Generate occurrence dates in chronological order starting from the schedule's
 * startDate. Skips blackout dates and stops at endDate. Does NOT apply
 * occurrenceLimit — callers decide how many to take. Bounded by an internal
 * safety cap so it can never loop forever.
 */
export function computeOccurrences(
  config: RecurrenceConfig,
  opts: { count?: number; after?: string } = {},
): string[] {
  const { count = 60, after } = opts;
  const interval = Math.max(1, config.interval || 1);
  const start = parse(config.startDate);
  const end = config.endDate ? parse(config.endDate) : null;
  const blackout = new Set(config.blackoutDates ?? []);
  const out: string[] = [];

  const emit = (d: Date): boolean => {
    // returns false when we should stop generating entirely
    if (end && d.getTime() > end.getTime()) return false;
    const s = fmt(d);
    if (d.getTime() >= start.getTime() && !blackout.has(s)) {
      if (!after || s > after) {
        out.push(s);
        if (out.length >= count) return false;
      }
    }
    return true;
  };

  const freq = config.frequency;
  const monthStep = monthStepFor(freq);

  if (freq === "Daily" || freq === "Custom") {
    let d = start;
    for (let i = 0; i < MAX_ITERATIONS && out.length < count; i++) {
      if (!emit(d)) break;
      d = addDays(d, interval);
    }
  } else if (freq === "Weekly") {
    const days = (config.weekdays.length ? [...config.weekdays] : [start.getUTCDay()])
      .filter((w) => w >= 0 && w <= 6)
      .sort((a, b) => a - b);
    let wk = startOfWeek(start);
    let iters = 0;
    outer: for (; iters < MAX_ITERATIONS && out.length < count; iters++) {
      for (const wd of days) {
        const d = addDays(wk, wd);
        if (end && d.getTime() > end.getTime()) break outer;
        if (!emit(d)) break outer;
      }
      wk = addDays(wk, 7 * interval);
    }
  } else if (monthStep !== null) {
    const days = (config.monthDays.length ? [...config.monthDays] : [start.getUTCDate()])
      .filter((n) => n >= 1 && n <= 31)
      .sort((a, b) => a - b);
    let m = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    let iters = 0;
    outer: for (; iters < MAX_ITERATIONS && out.length < count; iters++) {
      const y = m.getUTCFullYear();
      const mi = m.getUTCMonth();
      const dim = daysInMonth(y, mi);
      for (const dom of days) {
        if (dom > dim) continue;
        const d = new Date(Date.UTC(y, mi, dom));
        if (end && d.getTime() > end.getTime()) break outer;
        if (!emit(d)) break outer;
      }
      m = addMonths(m, monthStep * interval);
    }
  }

  return out;
}

/** First occurrence date on or after the schedule's startDate. */
export function firstOccurrence(config: RecurrenceConfig): string | null {
  const [first] = computeOccurrences(config, { count: 1 });
  return first ?? null;
}

/** Next occurrence date strictly after the given date, or null when none. */
export function nextOccurrenceAfter(
  config: RecurrenceConfig,
  after: string,
): string | null {
  const [next] = computeOccurrences(config, { count: 1, after });
  return next ?? null;
}

function toConfig(s: RecurrenceSchedule): RecurrenceConfig {
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

const today = (): string => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export interface RecurrenceRunResult {
  schedulesProcessed: number;
  generated: number;
  remindersEmitted: number;
  workOrderIds: string[];
}

/**
 * Idempotent generation worker. For each active schedule whose next run date is
 * due, it generates a Draft work order (never auto-scheduled — HITL) and records
 * an occurrence row. The unique (scheduleId, sequence) constraint guarantees a
 * given occurrence is generated at most once even across concurrent/repeat runs.
 * Also emits contract renewal/expiration reminders exactly once per contract.
 */
export async function runRecurrenceForTenant(
  tenantId: string,
): Promise<RecurrenceRunResult> {
  const now = today();
  const result: RecurrenceRunResult = {
    schedulesProcessed: 0,
    generated: 0,
    remindersEmitted: 0,
    workOrderIds: [],
  };

  const schedules = await db
    .select()
    .from(recurrenceSchedulesTable)
    .where(eq(recurrenceSchedulesTable.tenantId, tenantId));

  for (const schedule of schedules) {
    if (schedule.status !== "Active") continue;
    result.schedulesProcessed++;

    let cursor = schedule.nextRunDate ?? firstOccurrence(toConfig(schedule));
    let generatedCount = schedule.occurrencesGenerated;
    let lastGenerated = schedule.lastGeneratedDate;
    const config = toConfig(schedule);

    // Guard against runaway loops.
    for (let guard = 0; guard < 500; guard++) {
      if (!cursor) break;
      if (cursor > now) break;
      if (config.endDate && cursor > config.endDate) {
        cursor = null;
        break;
      }
      if (
        schedule.occurrenceLimit != null &&
        generatedCount >= schedule.occurrenceLimit
      ) {
        cursor = null;
        break;
      }

      const sequence = generatedCount + 1;
      // Idempotency backbone: insert the occurrence first; if it already exists
      // (unique scheduleId+sequence) we skip creating a duplicate work order.
      const inserted = await db
        .insert(recurrenceOccurrencesTable)
        .values({
          tenantId,
          scheduleId: schedule.id,
          sequence,
          scheduledDate: cursor,
          status: "Generated",
        })
        .onConflictDoNothing()
        .returning();

      if (inserted.length > 0) {
        const occurrence = inserted[0]!;
        const existing = await db
          .select({ id: workOrdersTable.id })
          .from(workOrdersTable)
          .where(eq(workOrdersTable.tenantId, tenantId));
        const number = `WO-2026-${existing.length + 1042}`;
        const [wo] = await db
          .insert(workOrdersTable)
          .values({
            tenantId,
            number,
            source: "Recurring Contract",
            customerId: schedule.customerId,
            locationId: schedule.locationId,
            priority: schedule.priority,
            status: "New",
            type: schedule.workOrderType,
            dueDate: cursor,
            description: schedule.description ?? schedule.title,
            assignedTechnicianId: schedule.assignedTechnicianId ?? null,
            portalSyncStatus: "Draft",
          })
          .returning();
        await db
          .update(recurrenceOccurrencesTable)
          .set({ workOrderId: wo!.id })
          .where(eq(recurrenceOccurrencesTable.id, occurrence.id));

        result.generated++;
        result.workOrderIds.push(wo!.id);
        await writeAudit({
          tenantId,
          actorName: "RoseOS Recurrence Worker",
          action: "Generated",
          entityType: "WorkOrder",
          entityId: wo!.id,
          summary: `Auto-generated ${wo!.number} from recurring schedule "${schedule.title}" (occurrence #${sequence})`,
          metadata: { scheduleId: schedule.id, sequence },
        });
      }

      generatedCount = sequence;
      lastGenerated = cursor;
      cursor = nextOccurrenceAfter(config, cursor);
    }

    // Auto-end when the occurrence limit is exhausted or the end date passed.
    let status = schedule.status;
    if (
      (schedule.occurrenceLimit != null &&
        generatedCount >= schedule.occurrenceLimit) ||
      (config.endDate && (!cursor || cursor > config.endDate))
    ) {
      if (!cursor) status = "Ended";
    }

    await db
      .update(recurrenceSchedulesTable)
      .set({
        occurrencesGenerated: generatedCount,
        lastGeneratedDate: lastGenerated,
        nextRunDate: cursor,
        status,
      })
      .where(eq(recurrenceSchedulesTable.id, schedule.id));
  }

  // Contract renewal/expiration reminders — emitted once per (contract, type).
  const contracts = await db
    .select()
    .from(serviceContractsTable)
    .where(eq(serviceContractsTable.tenantId, tenantId));
  const soon = new Date();
  soon.setUTCDate(soon.getUTCDate() + 30);
  const soonStr = soon.toISOString().slice(0, 10);

  for (const contract of contracts) {
    if (contract.status !== "Active") continue;
    const renewal = contract.renewalDate;
    let type: "Renewal" | "Expiration" | null = null;
    let message = "";
    if (renewal < now) {
      type = "Expiration";
      message = `Contract "${contract.name}" expired on ${renewal}.`;
    } else if (renewal <= soonStr) {
      type = "Renewal";
      message = `Contract "${contract.name}" is up for renewal on ${renewal}.`;
    }
    if (!type) continue;

    const inserted = await db
      .insert(contractRemindersTable)
      .values({
        tenantId,
        contractId: contract.id,
        customerId: contract.customerId,
        type,
        dueDate: renewal,
        message,
      })
      .onConflictDoNothing()
      .returning();
    if (inserted.length > 0) {
      result.remindersEmitted++;
      await writeAudit({
        tenantId,
        actorName: "RoseOS Recurrence Worker",
        action: "Reminder",
        entityType: "ServiceContract",
        entityId: contract.id,
        summary: message,
        metadata: { type },
      });
    }
  }

  return result;
}

export interface DocumentReminderRunResult {
  documentsScanned: number;
  remindersEmitted: number;
}

// System actor name stamped on auto-emitted expiration reminders. Used to
// distinguish them from user-created reminders and to dedupe: at most one
// system reminder per (document, expiration date).
const DOCUMENT_REMINDER_ACTOR = "RoseOS Document Reminder Worker";

/**
 * Emits expiration reminders for compliance documents/contracts that have an
 * expiration date within the next 30 days or already past. Reuses the existing
 * document_reminders table; dedupe is app-level (one system reminder per
 * document + expiration date), so this is safe to run repeatedly on a schedule.
 */
export async function runDocumentRemindersForTenant(
  tenantId: string,
): Promise<DocumentReminderRunResult> {
  const now = today();
  const soon = new Date();
  soon.setUTCDate(soon.getUTCDate() + 30);
  const soonStr = soon.toISOString().slice(0, 10);

  const documents = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.tenantId, tenantId));

  const result: DocumentReminderRunResult = {
    documentsScanned: 0,
    remindersEmitted: 0,
  };

  for (const doc of documents) {
    const expiration = doc.expiration;
    if (!expiration) continue;
    result.documentsScanned++;

    let reason = "";
    if (expiration < now) {
      reason = `Document "${doc.name}" expired on ${expiration}.`;
    } else if (expiration <= soonStr) {
      reason = `Document "${doc.name}" expires on ${expiration}.`;
    }
    if (!reason) continue;

    // Dedupe: skip if a system reminder for this document + expiration already
    // exists, so repeated runs never emit duplicates.
    const [existing] = await db
      .select({ id: documentRemindersTable.id })
      .from(documentRemindersTable)
      .where(
        and(
          eq(documentRemindersTable.tenantId, tenantId),
          eq(documentRemindersTable.documentId, doc.id),
          eq(documentRemindersTable.remindAt, expiration),
          eq(documentRemindersTable.createdByName, DOCUMENT_REMINDER_ACTOR),
        ),
      )
      .limit(1);
    if (existing) continue;

    await db.insert(documentRemindersTable).values({
      tenantId,
      documentId: doc.id,
      remindAt: expiration,
      reason,
      status: "Pending",
      createdByName: DOCUMENT_REMINDER_ACTOR,
    });
    result.remindersEmitted++;
    await writeAudit({
      tenantId,
      actorName: DOCUMENT_REMINDER_ACTOR,
      action: "Reminder",
      entityType: "Document",
      entityId: doc.id,
      summary: reason,
    });
  }

  return result;
}
