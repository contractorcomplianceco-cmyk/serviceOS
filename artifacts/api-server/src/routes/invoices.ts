import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  db,
  invoicesTable,
  paymentsTable,
  workOrdersTable,
  type InvoiceLine,
} from "@workspace/db";
import { CreateInvoiceBody, GetInvoiceParams } from "@workspace/api-zod";
import { requireAuth, requireStaff } from "../middleware/auth";
import { canManageBilling, isValidRole } from "../lib/authz";
import { toInvoice } from "../lib/serialize-ops";
import { writeAudit } from "../lib/audit";
import { notifyInvoiceIssued } from "../lib/notifications/dispatch-helpers";

const router: IRouter = Router();

// A work order must be human-approved for billing before it can be invoiced —
// RoseOS never auto-invoices. This is the billing-approval gate (state only).
const BILLABLE_STATUS = "Ready for Invoice";

router.get(
  "/invoices",
  requireAuth,
  requireStaff,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const rows = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.tenantId, user.tenantId))
      .orderBy(invoicesTable.createdAt);
    res.json(rows.reverse().map((r) => toInvoice(r)));
  },
);

router.post(
  "/invoices",
  requireAuth,
  requireStaff,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isValidRole(user.role) || !canManageBilling(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const parsed = CreateInvoiceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [wo] = await db
      .select()
      .from(workOrdersTable)
      .where(
        and(
          eq(workOrdersTable.id, d.workOrderId),
          eq(workOrdersTable.tenantId, user.tenantId),
        ),
      );
    if (!wo) {
      res.status(400).json({ error: "Work order not found" });
      return;
    }
    if (wo.billingStatus !== BILLABLE_STATUS) {
      res.status(400).json({
        error: `Work order must be "${BILLABLE_STATUS}" before invoicing (currently "${wo.billingStatus}")`,
      });
      return;
    }

    // Build invoice lines from approved labor/materials/expenses only.
    const lines: InvoiceLine[] = [];
    for (const l of wo.labor) {
      if (!l.approved) continue;
      lines.push({
        id: randomUUID(),
        description: `Labor — ${l.type}`,
        quantity: l.hours,
        rate: l.rate,
      });
    }
    for (const m of wo.materials) {
      if (!m.approved) continue;
      lines.push({
        id: randomUUID(),
        description: m.name,
        quantity: m.quantity,
        rate: m.billablePrice,
      });
    }
    for (const e of wo.expenses) {
      if (!e.approved) continue;
      lines.push({
        id: randomUUID(),
        description: e.description,
        quantity: 1,
        rate: e.amount,
      });
    }
    const amount = lines.reduce((sum, l) => sum + l.quantity * l.rate, 0);

    const now = new Date();
    const issueDate = now.toISOString().slice(0, 10);
    const due = new Date(now.getTime() + (d.dueInDays ?? 30) * 86_400_000);
    const dueDate = due.toISOString().slice(0, 10);

    const existing = await db
      .select({ id: invoicesTable.id })
      .from(invoicesTable)
      .where(eq(invoicesTable.tenantId, user.tenantId));
    const number = `INV-2026-${existing.length + 2001}`;

    const [row] = await db
      .insert(invoicesTable)
      .values({
        tenantId: user.tenantId,
        customerId: wo.customerId,
        workOrderId: wo.id,
        number,
        lines,
        amount,
        amountPaid: 0,
        status: "Invoiced",
        issueDate,
        dueDate,
        notes: d.notes ?? null,
      })
      .returning();

    await db
      .update(workOrdersTable)
      .set({ billingStatus: "Invoiced" })
      .where(eq(workOrdersTable.id, wo.id));

    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Invoiced",
        entityType: "Invoice",
        entityId: row!.id,
        summary: `Invoice ${number} created from ${wo.number} ($${amount.toFixed(2)})`,
        metadata: { workOrderId: wo.id },
        ip: req.ip ?? null,
      },
      req,
    );

    await notifyInvoiceIssued(row!);

    res.status(201).json(toInvoice(row!));
  },
);

router.get(
  "/invoices/:id",
  requireAuth,
  requireStaff,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const params = GetInvoiceParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [row] = await db
      .select()
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.id, params.data.id),
          eq(invoicesTable.tenantId, user.tenantId),
        ),
      );
    if (!row) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.invoiceId, row.id))
      .orderBy(paymentsTable.createdAt);
    res.json(toInvoice(row, payments));
  },
);

export default router;
