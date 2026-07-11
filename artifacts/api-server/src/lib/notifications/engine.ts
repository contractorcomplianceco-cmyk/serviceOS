import { and, desc, eq } from "drizzle-orm";
import {
  db,
  notificationsTable,
  notificationTemplatesTable,
  notificationPreferencesTable,
  type Notification,
  type NotificationChannel,
  type NotificationStatus,
  type NotificationStatusEvent,
} from "@workspace/db";
import { adapterFor } from "./channels";

// ---------------------------------------------------------------------------
// Notification engine.
//
// Flow: an event is raised (dispatchNotificationEvent) → for each recipient and
// each enabled channel that has a template + an opted-in preference, a
// notification row is created. Staff/in-app notifications deliver immediately.
// Customer-facing notifications are held at PendingApproval and never touch an
// external channel until a human approves them (HITL guardrail).
// ---------------------------------------------------------------------------

const RETRY_BACKOFF_MS = [0, 60_000, 300_000];

function appendHistory(
  history: NotificationStatusEvent[],
  status: NotificationStatus,
  detail: string,
): NotificationStatusEvent[] {
  return [...history, { at: new Date().toISOString(), status, detail }];
}

/** Replace {{token}} placeholders in a template body/subject. */
export function renderTemplate(
  text: string,
  context: Record<string, string>,
): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    const val = context[key];
    return val === undefined ? `{{${key}}}` : val;
  });
}

export interface NotificationRecipient {
  type: "user" | "customer";
  userId?: string | null;
  customerId?: string | null;
  address?: string | null;
}

export interface DispatchInput {
  tenantId: string;
  eventType: string;
  recipients: NotificationRecipient[];
  context?: Record<string, string>;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  /** Force a specific channel set; otherwise all templated channels are used. */
  channels?: NotificationChannel[];
}

async function preferenceEnabled(
  tenantId: string,
  recipient: NotificationRecipient,
  eventType: string,
  channel: NotificationChannel,
): Promise<boolean> {
  const scope = recipient.type;
  const idCol =
    scope === "user"
      ? notificationPreferencesTable.userId
      : notificationPreferencesTable.customerId;
  const idVal = scope === "user" ? recipient.userId : recipient.customerId;
  if (!idVal) return true;
  const [row] = await db
    .select()
    .from(notificationPreferencesTable)
    .where(
      and(
        eq(notificationPreferencesTable.tenantId, tenantId),
        eq(notificationPreferencesTable.scope, scope),
        eq(idCol, idVal),
        eq(notificationPreferencesTable.eventType, eventType),
        eq(notificationPreferencesTable.channel, channel),
      ),
    )
    .limit(1);
  // Missing preference => channel default (opted in).
  return row ? row.enabled : true;
}

/**
 * Raise a notification event. Creates one notification per (recipient, channel)
 * that has an enabled template and an opted-in preference. Delivers immediately
 * unless customer-facing (then held for approval). Never throws into callers.
 */
export async function dispatchNotificationEvent(
  input: DispatchInput,
): Promise<Notification[]> {
  const created: Notification[] = [];
  try {
    const templates = await db
      .select()
      .from(notificationTemplatesTable)
      .where(
        and(
          eq(notificationTemplatesTable.tenantId, input.tenantId),
          eq(notificationTemplatesTable.eventType, input.eventType),
          eq(notificationTemplatesTable.enabled, true),
        ),
      );
    if (templates.length === 0) return created;

    const context = input.context ?? {};
    for (const recipient of input.recipients) {
      for (const template of templates) {
        const channel = template.channel as NotificationChannel;
        if (input.channels && !input.channels.includes(channel)) continue;
        const enabled = await preferenceEnabled(
          input.tenantId,
          recipient,
          input.eventType,
          channel,
        );
        if (!enabled) continue;

        const requiresApproval = template.customerFacing;
        const initialStatus: NotificationStatus = requiresApproval
          ? "PendingApproval"
          : "Queued";
        const detail = requiresApproval
          ? "Held for approval (customer-facing) — will not deliver until approved"
          : "Queued for delivery";

        const [row] = await db
          .insert(notificationsTable)
          .values({
            tenantId: input.tenantId,
            eventType: input.eventType,
            channel,
            templateId: template.id,
            recipientType: recipient.type,
            recipientUserId: recipient.userId ?? null,
            recipientCustomerId: recipient.customerId ?? null,
            recipientAddress: recipient.address ?? null,
            subject: template.subject
              ? renderTemplate(template.subject, context)
              : null,
            body: renderTemplate(template.body, context),
            status: initialStatus,
            requiresApproval: requiresApproval ? "true" : "false",
            maxAttempts: 3,
            statusHistory: appendHistory([], initialStatus, detail),
            relatedEntityType: input.relatedEntityType ?? null,
            relatedEntityId: input.relatedEntityId ?? null,
          })
          .returning();
        if (!row) continue;

        if (requiresApproval) {
          created.push(row);
        } else {
          created.push(await deliverNotification(row.id));
        }
      }
    }
  } catch (err) {
    logNonFatal(err);
  }
  return created;
}

async function load(id: string): Promise<Notification | undefined> {
  const [row] = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.id, id))
    .limit(1);
  return row;
}

/** Attempt delivery via the channel adapter and record the outcome. */
export async function deliverNotification(id: string): Promise<Notification> {
  const current = await load(id);
  if (!current) throw new Error("Notification not found");

  // Blocked states never deliver.
  if (
    current.status === "PendingApproval" ||
    current.status === "Cancelled" ||
    current.status === "Suppressed"
  ) {
    return current;
  }

  const adapter = adapterFor(current.channel as NotificationChannel);
  const attempt = current.attempts + 1;
  let history = appendHistory(
    current.statusHistory,
    "Sending",
    `Attempt ${attempt} via ${adapter.label}`,
  );

  const result = await adapter.deliver({
    notificationId: current.id,
    channel: current.channel as NotificationChannel,
    recipientAddress: current.recipientAddress,
    subject: current.subject,
    body: current.body,
  });

  if (result.ok) {
    history = appendHistory(history, "Sent", result.detail);
    const [row] = await db
      .update(notificationsTable)
      .set({
        status: "Sent",
        attempts: attempt,
        sentAt: new Date(),
        lastError: null,
        nextAttemptAt: null,
        statusHistory: history,
      })
      .where(eq(notificationsTable.id, id))
      .returning();
    return row;
  }

  const canRetry = attempt < current.maxAttempts;
  const status: NotificationStatus = canRetry ? "Queued" : "Failed";
  const backoff = RETRY_BACKOFF_MS[Math.min(attempt, RETRY_BACKOFF_MS.length - 1)];
  history = appendHistory(
    history,
    status,
    canRetry
      ? `Failed (${result.detail}); will retry (attempt ${attempt}/${current.maxAttempts})`
      : `Failed permanently after ${attempt} attempts: ${result.detail}`,
  );
  const [row] = await db
    .update(notificationsTable)
    .set({
      status,
      attempts: attempt,
      lastError: result.detail,
      nextAttemptAt: canRetry ? new Date(Date.now() + backoff) : null,
      statusHistory: history,
    })
    .where(eq(notificationsTable.id, id))
    .returning();
  return row;
}

/** Manually retry a failed notification (staff action). */
export async function retryNotification(id: string): Promise<Notification> {
  const current = await load(id);
  if (!current) throw new Error("Notification not found");
  if (current.status !== "Failed") return current;
  // Give it one more attempt beyond the cap so manual retry always tries once.
  await db
    .update(notificationsTable)
    .set({
      status: "Queued",
      maxAttempts: current.attempts + 1,
      statusHistory: appendHistory(
        current.statusHistory,
        "Queued",
        "Manually re-queued for retry",
      ),
    })
    .where(eq(notificationsTable.id, id));
  return deliverNotification(id);
}

/** Approve a customer-facing notification and deliver it (staff action). */
export async function approveAndDeliverNotification(
  id: string,
  approverUserId: string,
): Promise<Notification> {
  const current = await load(id);
  if (!current) throw new Error("Notification not found");
  if (current.status !== "PendingApproval") return current;
  await db
    .update(notificationsTable)
    .set({
      status: "Approved",
      approvedByUserId: approverUserId,
      approvedAt: new Date(),
      statusHistory: appendHistory(
        current.statusHistory,
        "Approved",
        "Approved by staff — releasing for delivery",
      ),
    })
    .where(eq(notificationsTable.id, id));
  return deliverNotification(id);
}

export async function listNotificationsForUser(
  tenantId: string,
  userId: string,
): Promise<Notification[]> {
  return db
    .select()
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.tenantId, tenantId),
        eq(notificationsTable.recipientType, "user"),
        eq(notificationsTable.recipientUserId, userId),
      ),
    )
    .orderBy(desc(notificationsTable.createdAt));
}

/**
 * Staff approval queue: every customer-facing notification held at
 * PendingApproval across the tenant. These are held until a human approves them
 * (HITL) and are surfaced to approvers, not to the individual recipient center.
 */
export async function listPendingApprovalNotifications(
  tenantId: string,
): Promise<Notification[]> {
  return db
    .select()
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.tenantId, tenantId),
        eq(notificationsTable.status, "PendingApproval"),
      ),
    )
    .orderBy(desc(notificationsTable.createdAt));
}

function logNonFatal(err: unknown): void {
  // Engine failures must never break the calling request path.
  // eslint-disable-next-line no-console
  console.error("[notifications] dispatch error", err);
}
