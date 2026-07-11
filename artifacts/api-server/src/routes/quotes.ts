import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, quotesTable, customersTable } from "@workspace/db";
import { CreateQuoteBody, GetQuoteParams } from "@workspace/api-zod";
import { requireAuth, requireStaff } from "../middleware/auth";
import { canManageQuotes, isValidRole } from "../lib/authz";
import { toQuote } from "../lib/serialize-ops";
import { toDateStr } from "../lib/date-input";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

router.get(
  "/quotes",
  requireAuth,
  requireStaff,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const rows = await db
      .select()
      .from(quotesTable)
      .where(eq(quotesTable.tenantId, user.tenantId))
      .orderBy(quotesTable.createdAt);
    res.json(rows.reverse().map(toQuote));
  },
);

router.post(
  "/quotes",
  requireAuth,
  requireStaff,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isValidRole(user.role) || !canManageQuotes(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const parsed = CreateQuoteBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [customer] = await db
      .select()
      .from(customersTable)
      .where(
        and(
          eq(customersTable.id, d.customerId),
          eq(customersTable.tenantId, user.tenantId),
        ),
      );
    if (!customer) {
      res.status(400).json({ error: "Customer not found" });
      return;
    }
    const lines = d.lines.map((l) => ({
      id: randomUUID(),
      description: l.description,
      quantity: l.quantity,
      rate: l.rate,
    }));
    const amount = lines.reduce((sum, l) => sum + l.quantity * l.rate, 0);
    const existing = await db
      .select({ id: quotesTable.id })
      .from(quotesTable)
      .where(eq(quotesTable.tenantId, user.tenantId));
    const number = `QT-2026-${existing.length + 1001}`;
    const [row] = await db
      .insert(quotesTable)
      .values({
        tenantId: user.tenantId,
        customerId: d.customerId,
        locationId: d.locationId ?? null,
        workOrderId: d.workOrderId ?? null,
        number,
        title: d.title ?? "",
        lines,
        amount,
        status: d.status ?? "Draft",
        notes: d.notes ?? null,
        validUntil: toDateStr(d.validUntil),
      })
      .returning();
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Created",
        entityType: "Quote",
        entityId: row!.id,
        summary: `Quote ${number} created for ${customer.name}`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.status(201).json(toQuote(row!));
  },
);

router.get(
  "/quotes/:id",
  requireAuth,
  requireStaff,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const params = GetQuoteParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [row] = await db
      .select()
      .from(quotesTable)
      .where(
        and(
          eq(quotesTable.id, params.data.id),
          eq(quotesTable.tenantId, user.tenantId),
        ),
      );
    if (!row) {
      res.status(404).json({ error: "Quote not found" });
      return;
    }
    res.json(toQuote(row));
  },
);

export default router;
