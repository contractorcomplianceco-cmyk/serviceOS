import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  serviceContractsTable,
  contractRemindersTable,
  customersTable,
} from "@workspace/db";
import {
  CreateContractBody,
  UpdateContractBody,
  UpdateContractParams,
  GetContractParams,
  RenewContractBody,
  RenewContractParams,
} from "@workspace/api-zod";
import { requireAuth, requireStaff, requireNav } from "../middleware/auth";
import { canManageContracts, isValidRole } from "../lib/authz";
import { toServiceContract, toContractReminder } from "../lib/serialize-ops";
import { reqDateStr, toDateStr } from "../lib/date-input";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

router.get(
  "/contracts",
  requireAuth,
  requireNav("contracts"),
  async (req, res): Promise<void> => {
    const user = req.user!;
    const rows = await db
      .select()
      .from(serviceContractsTable)
      .where(eq(serviceContractsTable.tenantId, user.tenantId))
      .orderBy(serviceContractsTable.createdAt);
    res.json(rows.reverse().map(toServiceContract));
  },
);

router.get(
  "/contract-reminders",
  requireAuth,
  requireStaff,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const rows = await db
      .select()
      .from(contractRemindersTable)
      .where(
        and(
          eq(contractRemindersTable.tenantId, user.tenantId),
          eq(contractRemindersTable.status, "Open"),
        ),
      )
      .orderBy(contractRemindersTable.dueDate);
    res.json(rows.map(toContractReminder));
  },
);

router.post(
  "/contracts",
  requireAuth,
  requireNav("contracts"),
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isValidRole(user.role) || !canManageContracts(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const parsed = CreateContractBody.safeParse(req.body);
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
    const [row] = await db
      .insert(serviceContractsTable)
      .values({
        tenantId: user.tenantId,
        customerId: d.customerId,
        locationId: d.locationId ?? null,
        name: d.name,
        description: d.description ?? null,
        laborRate: d.laborRate ?? null,
        afterHoursRate: d.afterHoursRate ?? null,
        value: d.value ?? null,
        includedServices: d.includedServices ?? [],
        coveredEquipmentIds: d.coveredEquipmentIds ?? [],
        startDate: reqDateStr(d.startDate),
        renewalDate: reqDateStr(d.renewalDate),
      })
      .returning();
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Created",
        entityType: "ServiceContract",
        entityId: row!.id,
        summary: `Service contract "${d.name}" created for ${customer.name}`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.status(201).json(toServiceContract(row!));
  },
);

router.get(
  "/contracts/:id",
  requireAuth,
  requireNav("contracts"),
  async (req, res): Promise<void> => {
    const user = req.user!;
    const params = GetContractParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [row] = await db
      .select()
      .from(serviceContractsTable)
      .where(
        and(
          eq(serviceContractsTable.id, params.data.id),
          eq(serviceContractsTable.tenantId, user.tenantId),
        ),
      );
    if (!row) {
      res.status(404).json({ error: "Contract not found" });
      return;
    }
    res.json(toServiceContract(row));
  },
);

router.patch(
  "/contracts/:id",
  requireAuth,
  requireNav("contracts"),
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isValidRole(user.role) || !canManageContracts(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const params = UpdateContractParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = UpdateContractBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [existing] = await db
      .select()
      .from(serviceContractsTable)
      .where(
        and(
          eq(serviceContractsTable.id, params.data.id),
          eq(serviceContractsTable.tenantId, user.tenantId),
        ),
      );
    if (!existing) {
      res.status(404).json({ error: "Contract not found" });
      return;
    }
    const [row] = await db
      .update(serviceContractsTable)
      .set({
        name: d.name ?? undefined,
        description: d.description ?? undefined,
        laborRate: d.laborRate ?? undefined,
        afterHoursRate: d.afterHoursRate ?? undefined,
        value: d.value ?? undefined,
        includedServices: d.includedServices ?? undefined,
        coveredEquipmentIds: d.coveredEquipmentIds ?? undefined,
        renewalDate: toDateStr(d.renewalDate) ?? undefined,
        status: d.status ?? undefined,
        notes: d.notes ?? undefined,
      })
      .where(eq(serviceContractsTable.id, existing.id))
      .returning();
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Updated",
        entityType: "ServiceContract",
        entityId: existing.id,
        summary: `Service contract "${row!.name}" updated`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toServiceContract(row!));
  },
);

router.post(
  "/contracts/:id/renew",
  requireAuth,
  requireNav("contracts"),
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isValidRole(user.role) || !canManageContracts(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const params = RenewContractParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = RenewContractBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [existing] = await db
      .select()
      .from(serviceContractsTable)
      .where(
        and(
          eq(serviceContractsTable.id, params.data.id),
          eq(serviceContractsTable.tenantId, user.tenantId),
        ),
      );
    if (!existing) {
      res.status(404).json({ error: "Contract not found" });
      return;
    }
    let renewalDate = toDateStr(d.renewalDate);
    if (!renewalDate) {
      const months = d.termMonths ?? 12;
      const base = new Date(`${existing.renewalDate}T00:00:00.000Z`);
      base.setUTCMonth(base.getUTCMonth() + months);
      renewalDate = base.toISOString().slice(0, 10);
    }
    const [row] = await db
      .update(serviceContractsTable)
      .set({ renewalDate, status: "Active" })
      .where(eq(serviceContractsTable.id, existing.id))
      .returning();
    // Dismiss open reminders — renewing resolves them.
    await db
      .update(contractRemindersTable)
      .set({ status: "Dismissed" })
      .where(
        and(
          eq(contractRemindersTable.contractId, existing.id),
          eq(contractRemindersTable.status, "Open"),
        ),
      );
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Renewed",
        entityType: "ServiceContract",
        entityId: existing.id,
        summary: `Service contract "${row!.name}" renewed through ${renewalDate}`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toServiceContract(row!));
  },
);

export default router;
