import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, paymentsTable, invoicesTable } from "@workspace/db";
import { RecordPaymentBody } from "@workspace/api-zod";
import { requireAuth, requireStaff } from "../middleware/auth";
import { canRecordPayment, isValidRole } from "../lib/authz";
import { toPayment } from "../lib/serialize-ops";
import { reqDateStr } from "../lib/date-input";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

router.get(
  "/payments",
  requireAuth,
  requireStaff,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const rows = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.tenantId, user.tenantId))
      .orderBy(paymentsTable.createdAt);
    res.json(rows.reverse().map(toPayment));
  },
);

router.post(
  "/payments",
  requireAuth,
  requireStaff,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isValidRole(user.role) || !canRecordPayment(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const parsed = RecordPaymentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    try {
      const out = await db.transaction(async (tx) => {
        const [invoice] = await tx
          .select()
          .from(invoicesTable)
          .where(
            and(
              eq(invoicesTable.id, d.invoiceId),
              eq(invoicesTable.tenantId, user.tenantId),
            ),
          )
          .for("update");
        if (!invoice) return { notFound: true as const };

        const type = d.type ?? "Payment";
        // Guard the AR invariant (balance = amount - amountPaid never goes
        // negative): a non-refund payment cannot exceed the remaining balance,
        // and a refund cannot exceed what has already been paid. Overpayment is
        // not a supported flow.
        const balance = invoice.amount - invoice.amountPaid;
        const EPS = 1e-6;
        if (type === "Refund") {
          if (d.amount > invoice.amountPaid + EPS) {
            return {
              invalid:
                "Refund amount exceeds the amount paid on this invoice" as const,
            };
          }
        } else if (d.amount > balance + EPS) {
          return {
            invalid:
              "Payment amount exceeds the invoice's remaining balance" as const,
          };
        }
        const delta = type === "Refund" ? -d.amount : d.amount;
        const amountPaid = Math.max(0, invoice.amountPaid + delta);
        const date = d.date
          ? reqDateStr(d.date)
          : new Date().toISOString().slice(0, 10);

        let status = invoice.status;
        let paidDate = invoice.paidDate;
        if (amountPaid >= invoice.amount && invoice.amount > 0) {
          status = "Paid";
          paidDate = date;
        } else if (status === "Paid") {
          status = "Invoiced";
          paidDate = null;
        }

        const [payment] = await tx
          .insert(paymentsTable)
          .values({
            tenantId: user.tenantId,
            invoiceId: invoice.id,
            customerId: invoice.customerId,
            date,
            amount: d.amount,
            method: d.method ?? "Check",
            type,
            recordedByUserId: user.id,
            recordedByName: user.name,
            note: d.note ?? null,
          })
          .returning();

        await tx
          .update(invoicesTable)
          .set({ amountPaid, status, paidDate })
          .where(eq(invoicesTable.id, invoice.id));

        return { payment: payment!, invoice };
      });

      if ("notFound" in out) {
        res.status(400).json({ error: "Invoice not found" });
        return;
      }
      if ("invalid" in out) {
        res.status(400).json({ error: out.invalid });
        return;
      }
      await writeAudit(
        {
          tenantId: user.tenantId,
          actorUserId: user.id,
          actorName: user.name,
          action: "Payment Recorded",
          entityType: "Payment",
          entityId: out.payment.id,
          summary: `${out.payment.type} of $${out.payment.amount.toFixed(2)} on ${out.invoice.number}`,
          metadata: { invoiceId: out.invoice.id },
          ip: req.ip ?? null,
        },
        req,
      );
      res.status(201).json(toPayment(out.payment));
    } catch (err) {
      req.log.error({ err }, "Failed to record payment");
      res.status(500).json({ error: "Failed to record payment" });
    }
  },
);

export default router;
