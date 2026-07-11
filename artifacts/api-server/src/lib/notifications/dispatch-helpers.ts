import { and, eq } from "drizzle-orm";
import {
  db,
  customersTable,
  usersTable,
  type WorkOrder,
  type Invoice,
  type Closeout,
} from "@workspace/db";
import {
  dispatchNotificationEvent,
  type NotificationRecipient,
} from "./engine";

const money = (n: number): string =>
  `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const shortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// ---------------------------------------------------------------------------
// Lifecycle → notification helpers.
//
// These translate domain lifecycle events (a work order scheduled, an invoice
// issued, a closeout submitted/approved) into notification dispatches. They
// resolve the human-readable context and recipients, then hand off to the
// engine. Customer-facing dispatches are HELD for approval inside the engine —
// these helpers never send anything externally themselves.
//
// All helpers swallow their own errors: a notification failure must never break
// the primary business action that triggered it.
// ---------------------------------------------------------------------------

async function customerName(
  tenantId: string,
  customerId: string,
): Promise<{ name: string; email: string } | null> {
  const [row] = await db
    .select()
    .from(customersTable)
    .where(
      and(
        eq(customersTable.id, customerId),
        eq(customersTable.tenantId, tenantId),
      ),
    )
    .limit(1);
  return row ? { name: row.name, email: row.email } : null;
}

/** Managers who can approve customer-facing communications / closeouts. */
async function reviewerRecipients(
  tenantId: string,
): Promise<NotificationRecipient[]> {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.tenantId, tenantId));
  return rows
    .filter(
      (u) =>
        u.role === "Service Manager" || u.role === "Administrator",
    )
    .map((u) => ({ type: "user" as const, userId: u.id }));
}

export async function notifyWorkOrderScheduled(
  wo: WorkOrder,
): Promise<void> {
  try {
    const cust = await customerName(wo.tenantId, wo.customerId);
    const context: Record<string, string> = {
      workOrderNumber: wo.number,
      customerName: cust?.name ?? "Customer",
      scheduledDate: wo.scheduledStart
        ? shortDate(wo.scheduledStart.toISOString())
        : "TBD",
      status: wo.status,
    };
    const recipients: NotificationRecipient[] = [
      {
        type: "customer",
        customerId: wo.customerId,
        address: cust?.email ?? null,
      },
    ];
    if (wo.assignedTechnicianId) {
      recipients.push({ type: "user", userId: wo.assignedTechnicianId });
    }
    await dispatchNotificationEvent({
      tenantId: wo.tenantId,
      eventType: "work_order.scheduled",
      recipients,
      context,
      relatedEntityType: "WorkOrder",
      relatedEntityId: wo.id,
    });
  } catch {
    // notifications are best-effort
  }
}

export async function notifyWorkOrderCompleted(
  wo: WorkOrder,
): Promise<void> {
  try {
    const cust = await customerName(wo.tenantId, wo.customerId);
    await dispatchNotificationEvent({
      tenantId: wo.tenantId,
      eventType: "work_order.completed",
      recipients: [
        {
          type: "customer",
          customerId: wo.customerId,
          address: cust?.email ?? null,
        },
      ],
      context: {
        workOrderNumber: wo.number,
        customerName: cust?.name ?? "Customer",
        status: wo.status,
      },
      relatedEntityType: "WorkOrder",
      relatedEntityId: wo.id,
    });
  } catch {
    // best-effort
  }
}

export async function notifyInvoiceIssued(inv: Invoice): Promise<void> {
  try {
    const cust = await customerName(inv.tenantId, inv.customerId);
    await dispatchNotificationEvent({
      tenantId: inv.tenantId,
      eventType: "invoice.issued",
      recipients: [
        {
          type: "customer",
          customerId: inv.customerId,
          address: cust?.email ?? null,
        },
      ],
      context: {
        invoiceNumber: inv.number,
        customerName: cust?.name ?? "Customer",
        amount: money(inv.amount),
      },
      relatedEntityType: "Invoice",
      relatedEntityId: inv.id,
    });
  } catch {
    // best-effort
  }
}

export async function notifyCloseoutSubmitted(
  co: Closeout,
  workOrderNumber: string,
): Promise<void> {
  try {
    const recipients = await reviewerRecipients(co.tenantId);
    if (recipients.length === 0) return;
    await dispatchNotificationEvent({
      tenantId: co.tenantId,
      eventType: "closeout.submitted",
      recipients,
      context: { workOrderNumber, status: "Pending Review" },
      relatedEntityType: "Closeout",
      relatedEntityId: co.id,
    });
  } catch {
    // best-effort
  }
}

export async function notifyCloseoutApproved(
  co: Closeout,
  workOrderNumber: string,
  technicianUserId: string | null,
): Promise<void> {
  try {
    const recipients: NotificationRecipient[] = [];
    if (technicianUserId) {
      recipients.push({ type: "user", userId: technicianUserId });
    }
    if (recipients.length === 0) return;
    await dispatchNotificationEvent({
      tenantId: co.tenantId,
      eventType: "closeout.approved",
      recipients,
      context: { workOrderNumber, status: "Approved" },
      relatedEntityType: "Closeout",
      relatedEntityId: co.id,
    });
  } catch {
    // best-effort
  }
}
