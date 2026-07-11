import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  recommendationsTable,
  type Recommendation,
  type RecommendationLifecycleEvent,
} from "@workspace/db";
import {
  EditRecommendationBody,
  SnoozeRecommendationBody,
  AssignRecommendationBody,
} from "@workspace/api-zod";
import { requireAuth, requireNav } from "../middleware/auth";
import { canManageRecommendations, isValidRole } from "../lib/authz";
import { toRecommendation } from "../lib/serialize-ops";
import { generateRecommendations } from "../lib/recommendations/rules";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

function canManage(req: import("express").Request): boolean {
  const role = req.user!.role;
  return isValidRole(role) && canManageRecommendations(role);
}

async function load(
  tenantId: string,
  id: string,
): Promise<Recommendation | undefined> {
  const [row] = await db
    .select()
    .from(recommendationsTable)
    .where(
      and(
        eq(recommendationsTable.id, id),
        eq(recommendationsTable.tenantId, tenantId),
      ),
    );
  return row;
}

router.get(
  "/recommendations",
  requireAuth,
  requireNav("intelligence"),
  async (req, res): Promise<void> => {
    const user = req.user!;
    const statusFilter =
      typeof req.query.status === "string" ? req.query.status : undefined;
    const rows = await db
      .select()
      .from(recommendationsTable)
      .where(eq(recommendationsTable.tenantId, user.tenantId))
      .orderBy(recommendationsTable.createdAt);
    const filtered = statusFilter
      ? rows.filter((r) => r.status === statusFilter)
      : rows;
    res.json(filtered.reverse().map(toRecommendation));
  },
);

router.post(
  "/recommendations/generate",
  requireAuth,
  requireNav("intelligence"),
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!canManage(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const result = await generateRecommendations(user.tenantId);
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Generated",
        entityType: "Recommendation",
        entityId: "batch",
        summary: `RoseOS regenerated recommendations (+${result.created} new, ${result.resolved} resolved)`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(result);
  },
);

async function act(
  req: import("express").Request,
  res: import("express").Response,
  id: string,
  action: string,
  apply: (r: Recommendation, ev: RecommendationLifecycleEvent) => Partial<Recommendation>,
): Promise<void> {
  const user = req.user!;
  if (!canManage(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const existing = await load(user.tenantId, id);
  if (!existing) {
    res.status(404).json({ error: "Recommendation not found" });
    return;
  }
  const now = new Date();
  const ev: RecommendationLifecycleEvent = {
    at: now.toISOString(),
    actorId: user.id,
    actor: user.name,
    action,
    detail: `${action} by ${user.name}`,
  };
  const patch = apply(existing, ev);
  const [row] = await db
    .update(recommendationsTable)
    .set({
      ...patch,
      lifecycle: [...existing.lifecycle, ev],
      updatedAt: now,
    })
    .where(eq(recommendationsTable.id, existing.id))
    .returning();
  await writeAudit(
    {
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorName: user.name,
      action,
      entityType: "Recommendation",
      entityId: existing.id,
      summary: `Recommendation "${existing.title}" ${action.toLowerCase()}`,
      ip: req.ip ?? null,
    },
    req,
  );
  res.json(toRecommendation(row!));
}

router.post(
  "/recommendations/:id/approve",
  requireAuth,
  requireNav("intelligence"),
  async (req, res): Promise<void> => {
    await act(req, res, String(req.params.id), "Approved", () => ({ status: "Approved" }));
  },
);

router.post(
  "/recommendations/:id/reject",
  requireAuth,
  requireNav("intelligence"),
  async (req, res): Promise<void> => {
    await act(req, res, String(req.params.id), "Rejected", () => ({ status: "Rejected" }));
  },
);

router.post(
  "/recommendations/:id/resolve",
  requireAuth,
  requireNav("intelligence"),
  async (req, res): Promise<void> => {
    const user = req.user!;
    await act(req, res, String(req.params.id), "Resolved", () => ({
      status: "Resolved",
      resolvedByUserId: user.id,
      resolvedAt: new Date(),
    }));
  },
);

router.post(
  "/recommendations/:id/edit",
  requireAuth,
  requireNav("intelligence"),
  async (req, res): Promise<void> => {
    const parsed = EditRecommendationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    await act(req, res, String(req.params.id), "Edited", () => ({
      status: "Edited",
      editedTitle: d.title,
      editedDescription: d.description,
    }));
  },
);

router.post(
  "/recommendations/:id/snooze",
  requireAuth,
  requireNav("intelligence"),
  async (req, res): Promise<void> => {
    const parsed = SnoozeRecommendationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const until = new Date(parsed.data.snoozeUntil);
    if (Number.isNaN(until.getTime())) {
      res.status(400).json({ error: "Invalid snoozeUntil" });
      return;
    }
    await act(req, res, String(req.params.id), "Snoozed", () => ({
      status: "Snoozed",
      snoozeUntil: until,
    }));
  },
);

router.post(
  "/recommendations/:id/assign",
  requireAuth,
  requireNav("intelligence"),
  async (req, res): Promise<void> => {
    const parsed = AssignRecommendationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const assignee = parsed.data.assignedToUserId ?? null;
    await act(req, res, String(req.params.id), "Assigned", () => ({
      assignedToUserId: assignee,
    }));
  },
);

export default router;
