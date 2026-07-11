import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  integrationConnectionsTable,
  type IntegrationConnection,
} from "@workspace/db";
import {
  GetIntegrationConnectionParams,
  UpdateIntegrationConnectionParams,
  UpdateIntegrationConnectionBody,
  SimulateIntegrationInboundParams,
  ListIntegrationEventsParams,
  ApproveIntegrationEventParams,
  RetryIntegrationEventParams,
  RejectIntegrationEventParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import { canViewIntegrations, canManageIntegrations, isValidRole } from "../lib/authz";
import {
  toIntegrationConnection,
  toIntegrationEvent,
} from "../lib/serialize-ops";
import {
  listEvents,
  simulateInbound,
  approveEvent,
  rejectOutbound,
  retryEvent,
  runConnectionLifecycle,
} from "../lib/integrations/framework";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

function canView(role: string): boolean {
  return isValidRole(role) && canViewIntegrations(role);
}
function canManage(role: string): boolean {
  return isValidRole(role) && canManageIntegrations(role);
}

async function loadConn(
  tenantId: string,
  id: string,
): Promise<IntegrationConnection | undefined> {
  const [row] = await db
    .select()
    .from(integrationConnectionsTable)
    .where(
      and(
        eq(integrationConnectionsTable.id, id),
        eq(integrationConnectionsTable.tenantId, tenantId),
      ),
    )
    .limit(1);
  return row;
}

/** GET /integrations — list connections (staff view roles). */
router.get("/integrations", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!canView(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const rows = await db
    .select()
    .from(integrationConnectionsTable)
    .where(eq(integrationConnectionsTable.tenantId, user.tenantId));
  res.json(rows.map(toIntegrationConnection));
});

/** GET /integrations/:id — get one connection. */
router.get("/integrations/:id", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!canView(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = GetIntegrationConnectionParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const row = await loadConn(user.tenantId, parsed.data.id);
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(toIntegrationConnection(row));
});

/** PATCH /integrations/:id — update state/env/config (admin only). */
router.patch("/integrations/:id", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!canManage(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const params = UpdateIntegrationConnectionParams.safeParse(req.params);
  const body = UpdateIntegrationConnectionBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const existing = await loadConn(user.tenantId, params.data.id);
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const patch: Partial<typeof integrationConnectionsTable.$inferInsert> = {};
  if (body.data.name !== undefined) patch.name = body.data.name;
  if (body.data.state !== undefined) patch.state = body.data.state;
  if (body.data.environment !== undefined)
    patch.environment = body.data.environment;
  if (body.data.config !== undefined)
    patch.config = body.data.config as Record<string, unknown>;
  if (body.data.tokenHint !== undefined) patch.tokenHint = body.data.tokenHint;

  const [row] = await db
    .update(integrationConnectionsTable)
    .set(patch)
    .where(eq(integrationConnectionsTable.id, existing.id))
    .returning();

  // Run the connection lifecycle when the state actually transitions (sandbox
  // connect/authenticate/refresh or disconnect — no real credentials used).
  let lifecycleDetail = "";
  if (body.data.state !== undefined && body.data.state !== existing.state) {
    lifecycleDetail = await runConnectionLifecycle(row.id, body.data.state);
  }
  const [fresh] = await db
    .select()
    .from(integrationConnectionsTable)
    .where(eq(integrationConnectionsTable.id, row.id));

  await writeAudit(
    {
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorName: user.name,
      action: "integration.update",
      entityType: "Integration",
      entityId: row.id,
      summary: `Updated ${row.provider} connection (${row.state}/${row.environment})${lifecycleDetail ? ` — ${lifecycleDetail}` : ""}`,
      ip: req.ip,
    },
    req,
  );
  res.json(toIntegrationConnection(fresh ?? row));
});

/** POST /integrations/:id/simulate-inbound — simulate an inbound message. */
router.post("/integrations/:id/simulate-inbound", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!canManage(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = SimulateIntegrationInboundParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const conn = await loadConn(user.tenantId, parsed.data.id);
  if (!conn) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  try {
    const event = await simulateInbound(user.tenantId, conn.id);
    // Track inbound count so ServiceChannel fixtures rotate.
    await db
      .update(integrationConnectionsTable)
      .set({
        config: {
          ...conn.config,
          inboundCount:
            (typeof conn.config.inboundCount === "number"
              ? conn.config.inboundCount
              : 0) + 1,
        },
      })
      .where(eq(integrationConnectionsTable.id, conn.id));
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "integration.simulate_inbound",
        entityType: "Integration",
        entityId: conn.id,
        summary: `Simulated inbound from ${conn.provider} (${event.eventType})`,
        ip: req.ip,
      },
      req,
    );
    res.json(toIntegrationEvent(event));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/** GET /integrations/:id/events — sync history / approval queue. */
router.get("/integrations/:id/events", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!canView(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = ListIntegrationEventsParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const conn = await loadConn(user.tenantId, parsed.data.id);
  if (!conn) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const rows = await listEvents(user.tenantId, conn.id);
  res.json(rows.map(toIntegrationEvent));
});

/** POST /integration-events/:id/approve — approve + submit outbound. */
router.post("/integration-events/:id/approve", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!canManage(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = ApproveIntegrationEventParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const event = await approveEvent(user.tenantId, parsed.data.id, user.id);
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action:
          event.direction === "Inbound"
            ? "integration.approve_inbound"
            : "integration.approve_outbound",
        entityType: "Integration",
        entityId: event.id,
        summary: `Approved ${event.direction.toLowerCase()} ${event.eventType} (${event.status})`,
        ip: req.ip,
      },
      req,
    );
    res.json(toIntegrationEvent(event));
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

/** POST /integration-events/:id/retry — retry a failed event. */
router.post("/integration-events/:id/retry", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!canManage(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = RetryIntegrationEventParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const event = await retryEvent(user.tenantId, parsed.data.id);
    res.json(toIntegrationEvent(event));
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

/** POST /integration-events/:id/reject — reject a queued outbound event. */
router.post("/integration-events/:id/reject", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!canManage(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = RejectIntegrationEventParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const event = await rejectOutbound(user.tenantId, parsed.data.id);
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "integration.reject_outbound",
        entityType: "Integration",
        entityId: event.id,
        summary: `Rejected outbound ${event.eventType}`,
        ip: req.ip,
      },
      req,
    );
    res.json(toIntegrationEvent(event));
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

export default router;
