import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  notificationsTable,
  notificationTemplatesTable,
  notificationPreferencesTable,
  type NotificationChannel,
} from "@workspace/db";
import {
  MarkNotificationReadParams,
  RetryNotificationParams,
  ApproveNotificationParams,
  PreviewNotificationTemplateBody,
  TestSendNotificationBody,
  SetNotificationPreferenceBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import { isValidRole, isPortalUser } from "../lib/authz";
import {
  toNotification,
  toNotificationTemplate,
  toNotificationPreference,
} from "../lib/serialize-ops";
import {
  renderTemplate,
  retryNotification,
  approveAndDeliverNotification,
  listNotificationsForUser,
} from "../lib/notifications/engine";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

function isStaff(role: string): boolean {
  return isValidRole(role) && !isPortalUser(role);
}

// Sample context used to render template previews / test sends.
const SAMPLE_CONTEXT: Record<string, string> = {
  customerName: "Acme Retail",
  workOrderNumber: "WO-1042",
  technicianName: "Jordan Lee",
  scheduledDate: "Aug 3, 2026",
  invoiceNumber: "INV-2051",
  amount: "$1,240.00",
  status: "Completed",
};

/** GET /notifications — the current user's in-app notifications. */
router.get("/notifications", requireAuth, async (req, res) => {
  const user = req.user!;
  const rows = await listNotificationsForUser(user.tenantId, user.id);
  res.json(rows.map(toNotification));
});

/** POST /notifications/read-all — mark all of the user's notifications read. */
router.post("/notifications/read-all", requireAuth, async (req, res) => {
  const user = req.user!;
  const now = new Date();
  const updated = await db
    .update(notificationsTable)
    .set({ readAt: now })
    .where(
      and(
        eq(notificationsTable.tenantId, user.tenantId),
        eq(notificationsTable.recipientUserId, user.id),
      ),
    )
    .returning();
  const unread = updated.filter((r) => r.readAt).length;
  res.json({ updated: unread });
});

/** POST /notifications/:id/read — mark one notification read. */
router.post("/notifications/:id/read", requireAuth, async (req, res) => {
  const parsed = MarkNotificationReadParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const user = req.user!;
  const [row] = await db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notificationsTable.id, parsed.data.id),
        eq(notificationsTable.tenantId, user.tenantId),
        eq(notificationsTable.recipientUserId, user.id),
      ),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(toNotification(row));
});

/** POST /notifications/:id/retry — retry a failed delivery (staff only). */
router.post("/notifications/:id/retry", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!isStaff(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = RetryNotificationParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [existing] = await db
    .select()
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.id, parsed.data.id),
        eq(notificationsTable.tenantId, user.tenantId),
      ),
    )
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const row = await retryNotification(existing.id);
  await writeAudit(
    {
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorName: user.name,
      action: "notification.retry",
      entityType: "Notification",
      entityId: row.id,
      summary: `Retried ${row.channel} notification for ${row.eventType}`,
      ip: req.ip,
    },
    req,
  );
  res.json(toNotification(row));
});

/** POST /notifications/:id/approve — approve a customer-facing notification. */
router.post("/notifications/:id/approve", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!isStaff(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = ApproveNotificationParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [existing] = await db
    .select()
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.id, parsed.data.id),
        eq(notificationsTable.tenantId, user.tenantId),
      ),
    )
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const row = await approveAndDeliverNotification(existing.id, user.id);
  await writeAudit(
    {
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorName: user.name,
      action: "notification.approve",
      entityType: "Notification",
      entityId: row.id,
      summary: `Approved customer-facing ${row.channel} notification for ${row.eventType}`,
      ip: req.ip,
    },
    req,
  );
  res.json(toNotification(row));
});

/** GET /notification-templates — list templates (staff only). */
router.get("/notification-templates", requireAuth, async (req, res) => {
  const user = req.user!;
  if (!isStaff(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const rows = await db
    .select()
    .from(notificationTemplatesTable)
    .where(eq(notificationTemplatesTable.tenantId, user.tenantId));
  res.json(rows.map(toNotificationTemplate));
});

/** POST /notification-templates/preview — render with sample context. */
router.post(
  "/notification-templates/preview",
  requireAuth,
  async (req, res) => {
    const user = req.user!;
    if (!isStaff(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const parsed = PreviewNotificationTemplateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [tpl] = await db
      .select()
      .from(notificationTemplatesTable)
      .where(
        and(
          eq(notificationTemplatesTable.id, parsed.data.templateId),
          eq(notificationTemplatesTable.tenantId, user.tenantId),
        ),
      )
      .limit(1);
    if (!tpl) {
      res.status(400).json({ error: "Template not found" });
      return;
    }
    const context = { ...SAMPLE_CONTEXT, ...(parsed.data.context ?? {}) };
    res.json({
      channel: tpl.channel,
      subject: tpl.subject ? renderTemplate(tpl.subject, context) : null,
      body: renderTemplate(tpl.body, context),
    });
  },
);

/** POST /notification-templates/test-send — send yourself a test in-app note. */
router.post(
  "/notification-templates/test-send",
  requireAuth,
  async (req, res) => {
    const user = req.user!;
    if (!isStaff(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const parsed = TestSendNotificationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [tpl] = await db
      .select()
      .from(notificationTemplatesTable)
      .where(
        and(
          eq(notificationTemplatesTable.id, parsed.data.templateId),
          eq(notificationTemplatesTable.tenantId, user.tenantId),
        ),
      )
      .limit(1);
    if (!tpl) {
      res.status(400).json({ error: "Template not found" });
      return;
    }
    // A test send is always delivered as an in-app note to the requester,
    // regardless of the template's real channel — never to a customer.
    const now = new Date();
    const [row] = await db
      .insert(notificationsTable)
      .values({
        tenantId: user.tenantId,
        eventType: tpl.eventType,
        channel: "InApp",
        templateId: tpl.id,
        recipientType: "user",
        recipientUserId: user.id,
        subject: tpl.subject
          ? `[TEST] ${renderTemplate(tpl.subject, SAMPLE_CONTEXT)}`
          : "[TEST] Notification",
        body: `[Test send] ${renderTemplate(tpl.body, SAMPLE_CONTEXT)}`,
        status: "Sent",
        sentAt: now,
        statusHistory: [
          { at: now.toISOString(), status: "Sent", detail: "Test send to self (in-app)" },
        ],
      })
      .returning();
    res.status(201).json(toNotification(row));
  },
);

/** GET /notification-preferences — the current user's preferences. */
router.get("/notification-preferences", requireAuth, async (req, res) => {
  const user = req.user!;
  const rows = await db
    .select()
    .from(notificationPreferencesTable)
    .where(
      and(
        eq(notificationPreferencesTable.tenantId, user.tenantId),
        eq(notificationPreferencesTable.scope, "user"),
        eq(notificationPreferencesTable.userId, user.id),
      ),
    );
  res.json(rows.map(toNotificationPreference));
});

/** PUT /notification-preferences — upsert one of the user's preferences. */
router.put("/notification-preferences", requireAuth, async (req, res) => {
  const parsed = SetNotificationPreferenceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const user = req.user!;
  const { eventType, channel, enabled } = parsed.data;
  const [existing] = await db
    .select()
    .from(notificationPreferencesTable)
    .where(
      and(
        eq(notificationPreferencesTable.tenantId, user.tenantId),
        eq(notificationPreferencesTable.scope, "user"),
        eq(notificationPreferencesTable.userId, user.id),
        eq(notificationPreferencesTable.eventType, eventType),
        eq(notificationPreferencesTable.channel, channel as NotificationChannel),
      ),
    )
    .limit(1);

  if (existing) {
    const [row] = await db
      .update(notificationPreferencesTable)
      .set({ enabled })
      .where(eq(notificationPreferencesTable.id, existing.id))
      .returning();
    res.json(toNotificationPreference(row));
    return;
  }
  const [row] = await db
    .insert(notificationPreferencesTable)
    .values({
      tenantId: user.tenantId,
      scope: "user",
      userId: user.id,
      eventType,
      channel,
      enabled,
    })
    .returning();
  res.json(toNotificationPreference(row));
});

export default router;
