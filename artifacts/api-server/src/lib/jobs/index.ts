import { db, tenantsTable } from "@workspace/db";
import { logger } from "../logger";
import { enqueueJob, requeueStuckJobs, startJobPoller } from "./queue";
// Importing handlers registers them as a side effect.
import "./handlers";

export { enqueueJob } from "./queue";

// Recurring maintenance jobs seeded per tenant. dedupeKey guarantees exactly
// one live instance of each per tenant even across restarts.
const RECURRING: { type: Parameters<typeof enqueueJob>[0]["type"]; seconds: number }[] = [
  { type: "recommendations.generate", seconds: 120 },
  { type: "notifications.retry", seconds: 60 },
  { type: "portal.sync-retry", seconds: 90 },
  { type: "contracts.reminders", seconds: 300 },
  { type: "documents.reminders", seconds: 300 },
  { type: "recurrence.generate", seconds: 300 },
];

async function seedRecurringJobs(): Promise<void> {
  const tenants = await db.select().from(tenantsTable);
  for (const t of tenants) {
    for (const r of RECURRING) {
      await enqueueJob({
        tenantId: t.id,
        type: r.type,
        recurringSeconds: r.seconds,
        dedupeKey: `recurring:${r.type}`,
        maxAttempts: 5,
      });
    }
  }
  logger.info({ tenants: tenants.length }, "Seeded recurring background jobs");
}

// Called once after the HTTP server is listening.
export async function bootstrapJobs(): Promise<void> {
  try {
    const requeued = await requeueStuckJobs();
    if (requeued > 0) logger.info({ requeued }, "Requeued stuck jobs");
    await seedRecurringJobs();
    startJobPoller();
  } catch (err) {
    logger.error({ err }, "Failed to bootstrap background jobs");
  }
}
