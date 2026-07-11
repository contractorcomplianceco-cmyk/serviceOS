import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { db, jobsTable, type Job, type JobLogEntry, type JobType } from "@workspace/db";
import { logger } from "../logger";

// A job handler runs the work for one job and optionally returns a result
// summary that is stored on the job row.
export type JobHandler = (job: Job) => Promise<Record<string, unknown> | void>;

const handlers = new Map<JobType, JobHandler>();

export function registerJobHandler(type: JobType, handler: JobHandler): void {
  handlers.set(type, handler);
}

function appendLog(existing: JobLogEntry[], entry: JobLogEntry): JobLogEntry[] {
  // Keep the log bounded so a long-lived recurring job doesn't grow unbounded.
  return [...existing, entry].slice(-50);
}

// Exponential-ish backoff for one-shot retries.
function backoffSeconds(attempts: number): number {
  return Math.min(300, 15 * 2 ** Math.max(0, attempts - 1));
}

export interface EnqueueInput {
  tenantId: string;
  type: JobType;
  payload?: Record<string, unknown>;
  runAt?: Date;
  maxAttempts?: number;
  recurringSeconds?: number | null;
  dedupeKey?: string | null;
  createdByUserId?: string | null;
}

// Enqueue a job. If a dedupeKey is provided and an unfinished job with that key
// already exists, the existing job is returned instead of creating a duplicate.
export async function enqueueJob(input: EnqueueInput): Promise<Job> {
  if (input.dedupeKey) {
    const [existing] = await db
      .select()
      .from(jobsTable)
      .where(
        and(
          eq(jobsTable.tenantId, input.tenantId),
          eq(jobsTable.dedupeKey, input.dedupeKey),
          inArray(jobsTable.status, ["Pending", "Running"]),
        ),
      )
      .limit(1);
    if (existing) return existing;
  }
  const now = new Date();
  const [row] = await db
    .insert(jobsTable)
    .values({
      tenantId: input.tenantId,
      type: input.type,
      status: "Pending",
      payload: input.payload ?? {},
      runAt: input.runAt ?? now,
      maxAttempts: input.maxAttempts ?? 3,
      recurringSeconds: input.recurringSeconds ?? null,
      dedupeKey: input.dedupeKey ?? null,
      createdByUserId: input.createdByUserId ?? null,
      log: [
        { at: now.toISOString(), status: "Pending", detail: "Job enqueued" },
      ],
    })
    .returning();
  return row;
}

// Claim and run one due job. Returns true if a job was processed. Uses an
// atomic conditional update to claim so concurrent pollers never double-run.
async function runOne(): Promise<boolean> {
  const now = new Date();
  const [due] = await db
    .select()
    .from(jobsTable)
    .where(and(eq(jobsTable.status, "Pending"), lte(jobsTable.runAt, now)))
    .orderBy(asc(jobsTable.runAt))
    .limit(1);
  if (!due) return false;

  // Atomically claim — only succeeds if still Pending (guards against races).
  const [claimed] = await db
    .update(jobsTable)
    .set({
      status: "Running",
      startedAt: now,
      attempts: due.attempts + 1,
      log: appendLog(due.log, {
        at: now.toISOString(),
        status: "Running",
        detail: `Attempt ${due.attempts + 1}/${due.maxAttempts}`,
      }),
    })
    .where(and(eq(jobsTable.id, due.id), eq(jobsTable.status, "Pending")))
    .returning();
  if (!claimed) return true; // someone else claimed it; keep looping

  const handler = handlers.get(claimed.type as JobType);
  if (!handler) {
    await db
      .update(jobsTable)
      .set({
        status: "Failed",
        finishedAt: new Date(),
        lastError: `No handler registered for job type ${claimed.type}`,
        log: appendLog(claimed.log, {
          at: new Date().toISOString(),
          status: "Failed",
          detail: "No handler registered",
        }),
      })
      .where(eq(jobsTable.id, claimed.id));
    return true;
  }

  try {
    const result = (await handler(claimed)) ?? {};
    const done = new Date();
    if (claimed.recurringSeconds && claimed.recurringSeconds > 0) {
      // Recurring: record success, reset to Pending for the next interval.
      const next = new Date(done.getTime() + claimed.recurringSeconds * 1000);
      await db
        .update(jobsTable)
        .set({
          status: "Pending",
          result,
          finishedAt: done,
          runAt: next,
          lastError: null,
          log: appendLog(claimed.log, {
            at: done.toISOString(),
            status: "Succeeded",
            detail: `Succeeded; next run ${next.toISOString()}`,
          }),
        })
        .where(eq(jobsTable.id, claimed.id));
    } else {
      await db
        .update(jobsTable)
        .set({
          status: "Succeeded",
          result,
          finishedAt: done,
          lastError: null,
          log: appendLog(claimed.log, {
            at: done.toISOString(),
            status: "Succeeded",
            detail: "Completed",
          }),
        })
        .where(eq(jobsTable.id, claimed.id));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const done = new Date();
    const canRetry = claimed.attempts < claimed.maxAttempts;
    if (canRetry) {
      const next = new Date(done.getTime() + backoffSeconds(claimed.attempts) * 1000);
      await db
        .update(jobsTable)
        .set({
          status: "Pending",
          runAt: next,
          lastError: message,
          log: appendLog(claimed.log, {
            at: done.toISOString(),
            status: "Failed",
            detail: `Error: ${message}. Retry at ${next.toISOString()}`,
          }),
        })
        .where(eq(jobsTable.id, claimed.id));
    } else {
      await db
        .update(jobsTable)
        .set({
          status: "Failed",
          finishedAt: done,
          lastError: message,
          log: appendLog(claimed.log, {
            at: done.toISOString(),
            status: "Failed",
            detail: `Error: ${message}. Max attempts reached.`,
          }),
        })
        .where(eq(jobsTable.id, claimed.id));
    }
    logger.error({ err, jobId: claimed.id, type: claimed.type }, "Job failed");
  }
  return true;
}

let running = false;
let timer: NodeJS.Timeout | null = null;

// Drain all currently-due jobs, then reschedule the poll.
async function tick(intervalMs: number): Promise<void> {
  if (running) return;
  running = true;
  try {
    // Process up to a bounded number per tick to avoid starving the event loop.
    for (let i = 0; i < 25; i++) {
      const did = await runOne();
      if (!did) break;
    }
  } catch (err) {
    logger.error({ err }, "Job poller tick error");
  } finally {
    running = false;
    timer = setTimeout(() => void tick(intervalMs), intervalMs);
  }
}

export function startJobPoller(intervalMs = 5000): void {
  if (timer) return;
  logger.info({ intervalMs }, "Starting background job poller");
  timer = setTimeout(() => void tick(intervalMs), intervalMs);
}

// Mark long-stuck Running jobs (e.g. from a crashed process) back to Pending so
// they can be retried. Called once on startup.
export async function requeueStuckJobs(olderThanMs = 120_000): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMs);
  const rows = await db
    .update(jobsTable)
    .set({ status: "Pending" })
    .where(and(eq(jobsTable.status, "Running"), lte(jobsTable.startedAt, cutoff)))
    .returning();
  return rows.length;
}
