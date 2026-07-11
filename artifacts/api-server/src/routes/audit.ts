import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, auditLogTable } from "@workspace/db";
import { ListAuditEventsQueryParams } from "@workspace/api-zod";
import { requireAuth, requireRoles } from "../middleware/auth";

const router: IRouter = Router();

// GET /audit — tenant-scoped, immutable audit trail (managers/admins only).
router.get(
  "/audit",
  requireAuth,
  requireRoles("Administrator", "Service Manager", "Supervisor"),
  async (req, res): Promise<void> => {
    const parsed = ListAuditEventsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const user = req.user!;
    const { entityType, action, limit } = parsed.data;

    const filters = [eq(auditLogTable.tenantId, user.tenantId)];
    if (entityType) filters.push(eq(auditLogTable.entityType, entityType));
    if (action) filters.push(eq(auditLogTable.action, action));

    const rows = await db
      .select()
      .from(auditLogTable)
      .where(and(...filters))
      .orderBy(desc(auditLogTable.createdAt))
      .limit(limit ?? 100);

    res.json(
      rows.map((r) => ({
        id: r.id,
        tenantId: r.tenantId,
        actorUserId: r.actorUserId,
        actorName: r.actorName,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        summary: r.summary,
        ip: r.ip,
        timestamp: r.createdAt.toISOString(),
      })),
    );
  },
);

export default router;
