import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, jobsTable, jobTypes, type Job, type JobType } from "@workspace/db";
import { EnqueueJobBody } from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import { canViewJobs, canRunJobs, isValidRole } from "../lib/authz";
import { toJob } from "../lib/serialize-ops";
import { enqueueJob } from "../lib/jobs";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

router.get(
  "/jobs",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isValidRole(user.role) || !canViewJobs(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const statusFilter =
      typeof req.query.status === "string" ? req.query.status : undefined;
    const typeFilter =
      typeof req.query.type === "string" ? req.query.type : undefined;
    const rows = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.tenantId, user.tenantId))
      .orderBy(jobsTable.createdAt);
    let filtered = rows;
    if (statusFilter) filtered = filtered.filter((j) => j.status === statusFilter);
    if (typeFilter) filtered = filtered.filter((j) => j.type === typeFilter);
    res.json(filtered.reverse().map(toJob));
  },
);

router.post(
  "/jobs",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isValidRole(user.role) || !canRunJobs(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const parsed = EnqueueJobBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    if (!(jobTypes as readonly string[]).includes(d.type)) {
      res.status(400).json({ error: `Unknown job type "${d.type}"` });
      return;
    }
    const job = await enqueueJob({
      tenantId: user.tenantId,
      type: d.type as JobType,
      payload: (d.payload ?? {}) as Record<string, unknown>,
      createdByUserId: user.id,
    });
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Enqueued",
        entityType: "Job",
        entityId: job.id,
        summary: `Background job "${d.type}" enqueued`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.status(201).json(toJob(job));
  },
);

router.get(
  "/jobs/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isValidRole(user.role) || !canViewJobs(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const [row]: Job[] = await db
      .select()
      .from(jobsTable)
      .where(
        and(
          eq(jobsTable.id, String(req.params.id)),
          eq(jobsTable.tenantId, user.tenantId),
        ),
      );
    if (!row) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(toJob(row));
  },
);

export default router;
