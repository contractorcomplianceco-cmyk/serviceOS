import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  inventoryTable,
  purchaseRequestsTable,
  type PurchaseRequest,
} from "@workspace/db";
import {
  CreatePurchaseRequestBody,
  ApprovePurchaseRequestParams,
  ReceivePurchaseRequestParams,
  CancelPurchaseRequestParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import {
  canManageInventory,
  canApprovePurchase,
  isValidRole,
} from "../lib/authz";
import { toPurchaseRequest } from "../lib/serialize-ops";
import { postTransaction } from "../lib/inventory-ledger";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

router.get("/purchase-requests", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const rows = await db
    .select()
    .from(purchaseRequestsTable)
    .where(eq(purchaseRequestsTable.tenantId, user.tenantId))
    .orderBy(purchaseRequestsTable.createdAt);
  res.json(rows.reverse().map(toPurchaseRequest));
});

router.post("/purchase-requests", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!isValidRole(user.role) || !canManageInventory(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = CreatePurchaseRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid purchase request" });
    return;
  }
  const d = parsed.data;
  const [item] = await db
    .select()
    .from(inventoryTable)
    .where(
      and(eq(inventoryTable.id, d.itemId), eq(inventoryTable.tenantId, user.tenantId)),
    );
  if (!item) {
    res.status(400).json({ error: "Item not found" });
    return;
  }
  const [row] = await db
    .insert(purchaseRequestsTable)
    .values({
      tenantId: user.tenantId,
      itemId: d.itemId,
      itemName: item.name,
      quantity: d.quantity,
      location: d.location ?? item.location,
      vendor: d.vendor ?? item.vendor,
      reason: d.reason ?? null,
      status: "Requested",
      requestedByUserId: user.id,
      requestedByName: user.name,
    })
    .returning();
  await writeAudit(
    {
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorName: user.name,
      action: "Purchase Requested",
      entityType: "PurchaseRequest",
      entityId: row!.id,
      summary: `Requested ${d.quantity}× ${item.name}`,
      ip: req.ip ?? null,
    },
    req,
  );
  res.json(toPurchaseRequest(row!));
});

async function loadRequest(
  tenantId: string,
  id: string,
): Promise<PurchaseRequest | undefined> {
  const [row] = await db
    .select()
    .from(purchaseRequestsTable)
    .where(
      and(
        eq(purchaseRequestsTable.id, id),
        eq(purchaseRequestsTable.tenantId, tenantId),
      ),
    );
  return row;
}

router.post(
  "/purchase-requests/:id/approve",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isValidRole(user.role) || !canApprovePurchase(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const params = ApprovePurchaseRequestParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const existing = await loadRequest(user.tenantId, params.data.id);
    if (!existing) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (existing.status !== "Requested") {
      res.status(400).json({ error: `Cannot approve a ${existing.status} request` });
      return;
    }
    const [row] = await db
      .update(purchaseRequestsTable)
      .set({
        status: "Approved",
        approvedByUserId: user.id,
        approvedByName: user.name,
        approvedAt: new Date(),
      })
      .where(eq(purchaseRequestsTable.id, existing.id))
      .returning();
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Purchase Approved",
        entityType: "PurchaseRequest",
        entityId: existing.id,
        summary: `Approved ${existing.quantity}× ${existing.itemName ?? existing.itemId}`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toPurchaseRequest(row!));
  },
);

router.post(
  "/purchase-requests/:id/receive",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isValidRole(user.role) || !canApprovePurchase(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const params = ReceivePurchaseRequestParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    try {
      const out = await db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(purchaseRequestsTable)
          .where(
            and(
              eq(purchaseRequestsTable.id, params.data.id),
              eq(purchaseRequestsTable.tenantId, user.tenantId),
            ),
          )
          .for("update");
        if (!existing) return { notFound: true as const };
        if (existing.status === "Received" || existing.status === "Cancelled") {
          return { bad: `Cannot receive a ${existing.status} request` };
        }
        const [item] = await tx
          .select()
          .from(inventoryTable)
          .where(
            and(
              eq(inventoryTable.id, existing.itemId),
              eq(inventoryTable.tenantId, user.tenantId),
            ),
          )
          .for("update");
        if (!item) return { bad: "Item no longer exists" };
        await postTransaction(tx, {
          tenantId: user.tenantId,
          itemId: existing.itemId,
          type: "receipt",
          location: existing.location ?? item.location,
          quantity: existing.quantity,
          purchaseRequestId: existing.id,
          reason: "Purchase received",
          actorUserId: user.id,
          actorName: user.name,
        });
        const [row] = await tx
          .update(purchaseRequestsTable)
          .set({
            status: "Received",
            receivedByUserId: user.id,
            receivedByName: user.name,
            receivedAt: new Date(),
          })
          .where(eq(purchaseRequestsTable.id, existing.id))
          .returning();
        return { row: row!, existing, item };
      });
      if ("notFound" in out) {
        res.status(404).json({ error: "Request not found" });
        return;
      }
      if ("bad" in out) {
        res.status(400).json({ error: out.bad });
        return;
      }
      await writeAudit(
        {
          tenantId: user.tenantId,
          actorUserId: user.id,
          actorName: user.name,
          action: "Purchase Received",
          entityType: "PurchaseRequest",
          entityId: out.existing.id,
          summary: `Received ${out.existing.quantity}× ${out.item.name}`,
          ip: req.ip ?? null,
        },
        req,
      );
      res.json(toPurchaseRequest(out.row));
    } catch (err) {
      req.log.error({ err }, "Failed to receive purchase request");
      res.status(500).json({ error: "Failed to receive purchase request" });
    }
  },
);

router.post(
  "/purchase-requests/:id/cancel",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isValidRole(user.role) || !canManageInventory(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const params = CancelPurchaseRequestParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const existing = await loadRequest(user.tenantId, params.data.id);
    if (!existing) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (existing.status === "Received") {
      res.status(400).json({ error: "Cannot cancel a received request" });
      return;
    }
    const [row] = await db
      .update(purchaseRequestsTable)
      .set({ status: "Cancelled" })
      .where(eq(purchaseRequestsTable.id, existing.id))
      .returning();
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Purchase Cancelled",
        entityType: "PurchaseRequest",
        entityId: existing.id,
        summary: `Cancelled request for ${existing.itemName ?? existing.itemId}`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toPurchaseRequest(row!));
  },
);

export default router;
