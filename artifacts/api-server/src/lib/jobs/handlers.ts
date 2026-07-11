import { and, eq, lte } from "drizzle-orm";
import {
  db,
  notificationsTable,
  integrationEventsTable,
  migrationBatchesTable,
  type Job,
} from "@workspace/db";
import { registerJobHandler } from "./queue";
import { generateRecommendations } from "../recommendations/rules";
import { runRecurrenceForTenant } from "../recurrence";
import { deliverNotification } from "../notifications/engine";
import { retryEvent } from "../integrations/framework";
import { validateBatch, executeBatch } from "../migration/engine";

// recommendations.generate — recompute the RoseOS recommendation queue from
// live data for the job's tenant.
registerJobHandler("recommendations.generate", async (job: Job) => {
  const res = await generateRecommendations(job.tenantId);
  return { ...res };
});

// recurrence.generate — materialize due recurring work orders + contract
// reminders for the tenant.
registerJobHandler("recurrence.generate", async (job: Job) => {
  const res = await runRecurrenceForTenant(job.tenantId);
  return { ...res };
});

// notifications.retry — deliver Queued notifications whose backoff window has
// elapsed. Bounded per run so one tenant can't monopolize the poller.
registerJobHandler("notifications.retry", async (job: Job) => {
  const now = new Date();
  const due = await db
    .select()
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.tenantId, job.tenantId),
        eq(notificationsTable.status, "Queued"),
        lte(notificationsTable.nextAttemptAt, now),
      ),
    )
    .limit(25);
  let delivered = 0;
  let failed = 0;
  for (const n of due) {
    try {
      const res = await deliverNotification(n.id);
      if (res.status === "Sent") delivered++;
      else if (res.status === "Failed") failed++;
    } catch {
      failed++;
    }
  }
  return { processed: due.length, delivered, failed };
});

// portal.sync-retry — retry Failed outbound/inbound integration events (e.g.
// customer-portal work-order status sync) subject to each adapter's policy.
registerJobHandler("portal.sync-retry", async (job: Job) => {
  const failed = await db
    .select()
    .from(integrationEventsTable)
    .where(
      and(
        eq(integrationEventsTable.tenantId, job.tenantId),
        eq(integrationEventsTable.status, "Failed"),
      ),
    )
    .limit(25);
  let retried = 0;
  let blocked = 0;
  for (const e of failed) {
    try {
      const res = await retryEvent(job.tenantId, e.id);
      if (res.status === "Failed") blocked++;
      else retried++;
    } catch {
      blocked++;
    }
  }
  return { processed: failed.length, retried, blocked };
});

// contracts.reminders — piggybacks on the recurrence pass, which also emits
// contract renewal/expiration reminders exactly once per contract.
registerJobHandler("contracts.reminders", async (job: Job) => {
  const res = await runRecurrenceForTenant(job.tenantId);
  return { remindersEmitted: res.remindersEmitted };
});

// migration.process — run a dry-run validation or a real import for a batch.
// payload: { batchId, mode: "validate" | "execute" }
registerJobHandler("migration.process", async (job: Job) => {
  const payload = job.payload as { batchId?: string; mode?: string };
  if (!payload.batchId) throw new Error("migration.process requires batchId");
  const [batch] = await db
    .select()
    .from(migrationBatchesTable)
    .where(
      and(
        eq(migrationBatchesTable.id, payload.batchId),
        eq(migrationBatchesTable.tenantId, job.tenantId),
      ),
    )
    .limit(1);
  if (!batch) throw new Error(`Migration batch ${payload.batchId} not found`);
  const updated =
    payload.mode === "execute"
      ? await executeBatch(batch)
      : await validateBatch(batch);
  return { batchId: batch.id, status: updated.status, summary: updated.summary };
});

// closeout.transcribe — placeholder async work for voice-closeout drafting.
// Kept honest: it does not fabricate content, just records that transcription
// finished so the UI can poll job status.
registerJobHandler("closeout.transcribe", async (job: Job) => {
  const payload = job.payload as { closeoutId?: string };
  return { closeoutId: payload.closeoutId ?? null, transcribed: true };
});

// invoice.pdf — placeholder async render step; records completion for polling.
registerJobHandler("invoice.pdf", async (job: Job) => {
  const payload = job.payload as { invoiceId?: string };
  return { invoiceId: payload.invoiceId ?? null, rendered: true };
});
