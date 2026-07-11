import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, customersTable, type Customer } from "@workspace/db";
import {
  CreateCustomerBody,
  UpdateCustomerBody,
  UpdateCustomerParams,
} from "@workspace/api-zod";
import { requireAuth, requireNav } from "../middleware/auth";
import { toCustomer } from "../lib/serialize-ops";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

// GET /customers — tenant-scoped list.
router.get(
  "/customers",
  requireAuth,
  requireNav("customers"),
  async (req, res): Promise<void> => {
    const user = req.user!;
    const rows = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.tenantId, user.tenantId))
      .orderBy(customersTable.name);
    res.json(rows.map(toCustomer));
  },
);

// POST /customers — create a customer.
router.post(
  "/customers",
  requireAuth,
  requireNav("customers"),
  async (req, res): Promise<void> => {
    const parsed = CreateCustomerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const user = req.user!;
    const d = parsed.data;
    const [created] = await db
      .insert(customersTable)
      .values({
        tenantId: user.tenantId,
        name: d.name,
        industry: d.industry ?? undefined,
        phone: d.phone ?? undefined,
        email: d.email ?? undefined,
        status: d.status ?? undefined,
        accountManagerId: d.accountManagerId ?? undefined,
        tags: d.tags ?? undefined,
        contacts: d.contacts ?? undefined,
        rateRules: d.rateRules ?? undefined,
        requirements: d.requirements ?? undefined,
        portalRules: d.portalRules ?? undefined,
        taxCode: d.taxCode ?? undefined,
      })
      .returning();

    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Created",
        entityType: "Customer",
        entityId: created.id,
        summary: `Customer ${created.name} created`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.status(201).json(toCustomer(created));
  },
);

// PATCH /customers/:id — update a customer.
router.patch(
  "/customers/:id",
  requireAuth,
  requireNav("customers"),
  async (req, res): Promise<void> => {
    const params = UpdateCustomerParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateCustomerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const user = req.user!;
    const [target] = await db
      .select()
      .from(customersTable)
      .where(
        and(
          eq(customersTable.id, params.data.id),
          eq(customersTable.tenantId, user.tenantId),
        ),
      );
    if (!target) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    const d = parsed.data;
    const updates: Partial<Customer> = {};
    if (d.name !== undefined) updates.name = d.name;
    if (d.industry !== undefined) updates.industry = d.industry;
    if (d.phone !== undefined) updates.phone = d.phone;
    if (d.email !== undefined) updates.email = d.email;
    if (d.status !== undefined) updates.status = d.status;
    if (d.accountManagerId !== undefined)
      updates.accountManagerId = d.accountManagerId;
    if (d.tags !== undefined) updates.tags = d.tags;
    if (d.contacts !== undefined) updates.contacts = d.contacts;
    if (d.rateRules !== undefined) updates.rateRules = d.rateRules;
    if (d.requirements !== undefined) updates.requirements = d.requirements;
    if (d.portalRules !== undefined) updates.portalRules = d.portalRules;
    if (d.taxCode !== undefined) updates.taxCode = d.taxCode;
    if (d.balance !== undefined) updates.balance = d.balance;

    const [updated] = await db
      .update(customersTable)
      .set(updates)
      .where(eq(customersTable.id, target.id))
      .returning();

    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Updated",
        entityType: "Customer",
        entityId: target.id,
        summary: `Customer ${updated.name} updated`,
        metadata: { fields: Object.keys(updates) },
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toCustomer(updated));
  },
);

export default router;
