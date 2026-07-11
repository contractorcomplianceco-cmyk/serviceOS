import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  customersTable,
  locationsTable,
  workOrdersTable,
  quotesTable,
  invoicesTable,
  paymentsTable,
  documentsTable,
  equipmentTable,
  filesTable,
} from "@workspace/db";
import {
  UpdatePortalProfileBody,
  CreatePortalRequestBody,
  GetPortalWorkOrderParams,
  DecidePortalQuoteBody,
  DecidePortalQuoteParams,
} from "@workspace/api-zod";
import { requireAuth, requirePortalUser } from "../middleware/auth";
import {
  toPortalWorkOrder,
  toPortalQuote,
  toPortalInvoice,
  toPortalPayment,
  toPortalDocument,
  toPortalEquipment,
} from "../lib/serialize-portal";
import { isCustomerVisibleDocument } from "../lib/authz";
import { getStorageAdapter } from "../lib/storage";
import { checkFilePolicy, normalizeContentType } from "../lib/file-policy";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

// Quote statuses that are safe to expose to the customer (drafts are hidden).
const VISIBLE_QUOTE_STATUSES = ["Sent", "Approved", "Rejected", "Expired"];
// Invoice statuses that are safe to expose (internal pre-invoice states hidden).
const VISIBLE_INVOICE_STATUSES = ["Invoiced", "Paid", "Past Due"];
// portalSyncStatus values that mean a work order has been published to the
// portal. Everything else ("Draft", "Needs Approval", "Ready to Send",
// "Manual Copy Needed") is an internal, not-yet-approved state that must NEVER
// reach the customer — recurrence-generated drafts land in "Draft".
const VISIBLE_WO_SYNC_STATUSES = ["Sent", "Synced"];
// Work order statuses considered "open" for dashboard counts.
const CLOSED_WO_STATUSES = ["Completed", "Closed", "Cancelled", "Invoiced"];

async function buildProfile(userId: string, tenantId: string, customerId: string) {
  const [customer] = await db
    .select()
    .from(customersTable)
    .where(
      and(eq(customersTable.id, customerId), eq(customersTable.tenantId, tenantId)),
    );
  const locations = await db
    .select()
    .from(locationsTable)
    .where(
      and(
        eq(locationsTable.customerId, customerId),
        eq(locationsTable.tenantId, tenantId),
      ),
    );
  return { customer, locations, userId };
}

router.get(
  "/portal/me",
  requireAuth,
  requirePortalUser,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const { customer, locations } = await buildProfile(
      user.id,
      user.tenantId,
      user.customerId!,
    );
    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    res.json({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      customerId: customer.id,
      name: customer.name,
      industry: customer.industry,
      email: customer.email,
      phone: customer.phone,
      locations: locations.map((l) => ({
        id: l.id,
        name: l.name,
        address: l.address,
        city: l.city,
        state: l.state,
        zip: l.zip,
      })),
    });
  },
);

router.patch(
  "/portal/profile",
  requireAuth,
  requirePortalUser,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const parsed = UpdatePortalProfileBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    await db
      .update(customersTable)
      .set({
        email: d.email ?? undefined,
        phone: d.phone ?? undefined,
      })
      .where(
        and(
          eq(customersTable.id, user.customerId!),
          eq(customersTable.tenantId, user.tenantId),
        ),
      );
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Updated",
        entityType: "Customer",
        entityId: user.customerId!,
        summary: `Portal user updated contact info`,
        ip: req.ip ?? null,
      },
      req,
    );
    const { customer, locations } = await buildProfile(
      user.id,
      user.tenantId,
      user.customerId!,
    );
    res.json({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      customerId: customer!.id,
      name: customer!.name,
      industry: customer!.industry,
      email: customer!.email,
      phone: customer!.phone,
      locations: locations.map((l) => ({
        id: l.id,
        name: l.name,
        address: l.address,
        city: l.city,
        state: l.state,
        zip: l.zip,
      })),
    });
  },
);

router.get(
  "/portal/dashboard",
  requireAuth,
  requirePortalUser,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const cid = user.customerId!;
    const [wos, quotes, invoices] = await Promise.all([
      db
        .select()
        .from(workOrdersTable)
        .where(
          and(
            eq(workOrdersTable.tenantId, user.tenantId),
            eq(workOrdersTable.customerId, cid),
          ),
        ),
      db
        .select()
        .from(quotesTable)
        .where(
          and(
            eq(quotesTable.tenantId, user.tenantId),
            eq(quotesTable.customerId, cid),
          ),
        ),
      db
        .select()
        .from(invoicesTable)
        .where(
          and(
            eq(invoicesTable.tenantId, user.tenantId),
            eq(invoicesTable.customerId, cid),
          ),
        ),
    ]);

    // Only portal-published work orders may inform any customer-facing count or
    // list — never internal drafts / unapproved sync states.
    const visibleWos = wos.filter((w) =>
      VISIBLE_WO_SYNC_STATUSES.includes(w.portalSyncStatus),
    );
    const openWorkOrders = visibleWos.filter(
      (w) => !CLOSED_WO_STATUSES.includes(w.status),
    ).length;
    const pendingQuotes = quotes.filter((q) => q.status === "Sent").length;
    const openInvoices = invoices.filter(
      (i) => i.status === "Invoiced" || i.status === "Past Due",
    );
    const outstandingBalance = openInvoices.reduce(
      (sum, i) => sum + (i.amount - i.amountPaid),
      0,
    );

    const now = Date.now();
    const upcomingVisits = visibleWos
      .filter((w) => w.scheduledStart && w.scheduledStart.getTime() >= now)
      .sort(
        (a, b) => a.scheduledStart!.getTime() - b.scheduledStart!.getTime(),
      )
      .slice(0, 5)
      .map((w) => ({
        date: w.scheduledStart!.toISOString(),
        title: `${w.number} — ${w.type || "Service"}`,
        workOrderId: w.id,
        locationId: w.locationId,
      }));

    const recentWorkOrders = [...visibleWos]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map(toPortalWorkOrder);

    res.json({
      openWorkOrders,
      pendingQuotes,
      openInvoices: openInvoices.length,
      outstandingBalance,
      upcomingVisits,
      recentWorkOrders,
    });
  },
);

router.get(
  "/portal/work-orders",
  requireAuth,
  requirePortalUser,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const rows = await db
      .select()
      .from(workOrdersTable)
      .where(
        and(
          eq(workOrdersTable.tenantId, user.tenantId),
          eq(workOrdersTable.customerId, user.customerId!),
        ),
      )
      .orderBy(workOrdersTable.createdAt);
    res.json(
      rows
        .filter((w) => VISIBLE_WO_SYNC_STATUSES.includes(w.portalSyncStatus))
        .reverse()
        .map(toPortalWorkOrder),
    );
  },
);

router.get(
  "/portal/work-orders/:id",
  requireAuth,
  requirePortalUser,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const params = GetPortalWorkOrderParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [row] = await db
      .select()
      .from(workOrdersTable)
      .where(
        and(
          eq(workOrdersTable.id, params.data.id),
          eq(workOrdersTable.tenantId, user.tenantId),
          eq(workOrdersTable.customerId, user.customerId!),
        ),
      );
    // 404 (not 403) for not-yet-published work orders so their existence isn't
    // even confirmed to the customer.
    if (!row || !VISIBLE_WO_SYNC_STATUSES.includes(row.portalSyncStatus)) {
      res.status(404).json({ error: "Work order not found" });
      return;
    }
    res.json(toPortalWorkOrder(row));
  },
);

router.get(
  "/portal/requests",
  requireAuth,
  requirePortalUser,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const rows = await db
      .select()
      .from(workOrdersTable)
      .where(
        and(
          eq(workOrdersTable.tenantId, user.tenantId),
          eq(workOrdersTable.customerId, user.customerId!),
          eq(workOrdersTable.source, "Customer Portal"),
        ),
      )
      .orderBy(workOrdersTable.createdAt);
    res.json(rows.reverse().map(toPortalWorkOrder));
  },
);

router.post(
  "/portal/requests",
  requireAuth,
  requirePortalUser,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const parsed = CreatePortalRequestBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    // Location must belong to THIS customer — never trust the client.
    const [location] = await db
      .select()
      .from(locationsTable)
      .where(
        and(
          eq(locationsTable.id, d.locationId),
          eq(locationsTable.tenantId, user.tenantId),
          eq(locationsTable.customerId, user.customerId!),
        ),
      );
    if (!location) {
      res.status(400).json({ error: "Location not found" });
      return;
    }
    const requestedDate =
      d.requestedDate instanceof Date
        ? d.requestedDate.toISOString().slice(0, 10)
        : (d.requestedDate ?? new Date().toISOString().slice(0, 10));

    // Verify every uploaded attachment against the ACTUAL stored bytes — never
    // trust the client's declared metadata (a signed PUT can upload anything,
    // then register compliant-looking JSON). This mirrors the /files guard.
    const storage = getStorageAdapter();
    const attachmentEntries: {
      id: string;
      name: string;
      type: "Photo" | "Document" | "PDF";
      uploadedBy: string;
      date: string;
    }[] = [];
    const fileInserts: {
      objectPath: string;
      name: string;
      contentType: string;
      size: number;
    }[] = [];
    for (const att of d.attachments ?? []) {
      const objectPath = storage.normalizeObjectPath(att.objectPath);
      // Portal customers may only reference objects in the fresh signed-upload
      // namespace — never arbitrary /objects/* paths. Combined with the
      // unguessable random upload id, this keeps a customer from binding an
      // object they didn't just upload through the portal's own upload flow.
      if (!objectPath.startsWith("/objects/uploads/")) {
        res.status(400).json({ error: "Attachment path is not a portal upload" });
        return;
      }
      const stat = await storage.statObject(objectPath);
      if (!stat) {
        res.status(400).json({ error: "Attachment could not be verified" });
        return;
      }
      const policyError = checkFilePolicy({
        size: stat.size,
        contentType: stat.contentType,
      });
      if (policyError) {
        res.status(400).json({ error: policyError });
        return;
      }
      if (
        stat.size !== att.size ||
        normalizeContentType(stat.contentType) !==
          normalizeContentType(att.contentType)
      ) {
        res.status(400).json({
          error: "Declared attachment metadata does not match the uploaded file",
        });
        return;
      }
      attachmentEntries.push({
        id: randomUUID(),
        name: att.name,
        type: stat.contentType.startsWith("image/") ? "Photo" : "Document",
        uploadedBy: user.name,
        date: new Date().toISOString(),
      });
      fileInserts.push({
        objectPath,
        name: att.name,
        contentType: stat.contentType,
        size: stat.size,
      });
    }

    const existing = await db
      .select({ id: workOrdersTable.id })
      .from(workOrdersTable)
      .where(eq(workOrdersTable.tenantId, user.tenantId));
    const number = `WO-2026-${existing.length + 1042}`;

    // Customer requests are NEVER auto-scheduled — they enter triage as a new
    // work order for staff to review (HITL).
    const [row] = await db
      .insert(workOrdersTable)
      .values({
        tenantId: user.tenantId,
        number,
        source: "Customer Portal",
        customerId: user.customerId!,
        locationId: d.locationId,
        priority: d.priority ?? "Medium",
        status: "Triage Needed",
        region: location.region,
        dueDate: requestedDate,
        description: d.description,
        portalSyncStatus: "Synced",
        attachments: attachmentEntries,
      })
      .returning();

    // Persist file rows (with an ACL owner) linked to the new work order so the
    // customer's uploads are visible to staff during triage.
    for (const f of fileInserts) {
      try {
        await storage.setObjectAcl(f.objectPath, user.id, "private");
      } catch (err) {
        req.log.warn({ err }, "Could not set ACL on portal attachment");
      }
      await db.insert(filesTable).values({
        tenantId: user.tenantId,
        objectPath: f.objectPath,
        name: f.name,
        contentType: f.contentType,
        size: f.size,
        entityType: "WorkOrder",
        entityId: row!.id,
        version: 1,
        visibility: "All Staff",
        uploadedByUserId: user.id,
        uploadedByName: user.name,
      });
    }
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Created",
        entityType: "WorkOrder",
        entityId: row!.id,
        summary: `Customer portal request ${number} submitted`,
        metadata: { source: "Customer Portal" },
        ip: req.ip ?? null,
      },
      req,
    );
    res.status(201).json(toPortalWorkOrder(row!));
  },
);

router.get(
  "/portal/quotes",
  requireAuth,
  requirePortalUser,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const rows = await db
      .select()
      .from(quotesTable)
      .where(
        and(
          eq(quotesTable.tenantId, user.tenantId),
          eq(quotesTable.customerId, user.customerId!),
        ),
      )
      .orderBy(quotesTable.createdAt);
    res.json(
      rows
        .filter((q) => VISIBLE_QUOTE_STATUSES.includes(q.status))
        .reverse()
        .map(toPortalQuote),
    );
  },
);

router.post(
  "/portal/quotes/:id/decide",
  requireAuth,
  requirePortalUser,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const params = DecidePortalQuoteParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = DecidePortalQuoteBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [quote] = await db
      .select()
      .from(quotesTable)
      .where(
        and(
          eq(quotesTable.id, params.data.id),
          eq(quotesTable.tenantId, user.tenantId),
          eq(quotesTable.customerId, user.customerId!),
        ),
      );
    if (!quote) {
      res.status(404).json({ error: "Quote not found" });
      return;
    }
    if (quote.status !== "Sent") {
      res.status(400).json({ error: "Only sent quotes can be decided" });
      return;
    }
    // HITL: the customer's decision is recorded as state only. It never
    // auto-creates a work order or invoice — staff act on it downstream.
    const [row] = await db
      .update(quotesTable)
      .set({
        status: d.decision,
        decidedAt: new Date(),
        decidedByName: user.name,
        decisionNote: d.note ?? null,
      })
      .where(eq(quotesTable.id, quote.id))
      .returning();
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: d.decision === "Approved" ? "Approved" : "Rejected",
        entityType: "Quote",
        entityId: quote.id,
        summary: `Customer ${d.decision.toLowerCase()} quote ${quote.number}`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toPortalQuote(row!));
  },
);

router.get(
  "/portal/invoices",
  requireAuth,
  requirePortalUser,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const rows = await db
      .select()
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.tenantId, user.tenantId),
          eq(invoicesTable.customerId, user.customerId!),
        ),
      )
      .orderBy(invoicesTable.createdAt);
    res.json(
      rows
        .filter((i) => VISIBLE_INVOICE_STATUSES.includes(i.status))
        .reverse()
        .map(toPortalInvoice),
    );
  },
);

router.get(
  "/portal/payments",
  requireAuth,
  requirePortalUser,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const rows = await db
      .select()
      .from(paymentsTable)
      .where(
        and(
          eq(paymentsTable.tenantId, user.tenantId),
          eq(paymentsTable.customerId, user.customerId!),
        ),
      )
      .orderBy(paymentsTable.createdAt);
    res.json(rows.reverse().map(toPortalPayment));
  },
);

router.get(
  "/portal/documents",
  requireAuth,
  requirePortalUser,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const rows = await db
      .select()
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.tenantId, user.tenantId),
          eq(documentsTable.customerId, user.customerId!),
        ),
      )
      .orderBy(documentsTable.createdAt);
    // Every staff visibility class ("All Staff", "Managers Only", "Billing
    // Only") is INTERNAL. Only documents explicitly marked customer-facing may
    // reach the portal — otherwise internal contracts/W-9s/billing rules leak.
    res.json(
      rows
        .filter((d) => isCustomerVisibleDocument(d.visibility))
        .reverse()
        .map(toPortalDocument),
    );
  },
);

router.get(
  "/portal/equipment",
  requireAuth,
  requirePortalUser,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const rows = await db
      .select()
      .from(equipmentTable)
      .where(
        and(
          eq(equipmentTable.tenantId, user.tenantId),
          eq(equipmentTable.customerId, user.customerId!),
        ),
      )
      .orderBy(equipmentTable.createdAt);
    res.json(rows.reverse().map(toPortalEquipment));
  },
);

export default router;
