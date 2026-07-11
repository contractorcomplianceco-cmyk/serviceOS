import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  inventoryTable,
  inventoryTransactionsTable,
  type InventoryTransaction,
} from "@workspace/db";
import {
  CreateInventoryTransferBody,
  CreateInventoryReservationBody,
  ReleaseInventoryReservationBody,
  CreateInventoryAdjustmentBody,
  CreateInventoryCycleCountBody,
  ListInventoryTransactionsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import {
  canManageInventory,
  canOverrideStock,
  isValidRole,
  type Role,
} from "../lib/authz";
import {
  toInventoryItem,
  toInventoryTransaction,
} from "../lib/serialize-ops";
import {
  balancesForItem,
  postTransaction,
  NegativeStockError,
} from "../lib/inventory-ledger";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

// GET /inventory — tenant-scoped list with balances DERIVED from the ledger.
// Available to any authenticated user because the material picker needs it.
router.get("/inventory", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const [items, txns] = await Promise.all([
    db
      .select()
      .from(inventoryTable)
      .where(eq(inventoryTable.tenantId, user.tenantId))
      .orderBy(inventoryTable.name),
    db
      .select()
      .from(inventoryTransactionsTable)
      .where(eq(inventoryTransactionsTable.tenantId, user.tenantId)),
  ]);
  const byItem = new Map<string, InventoryTransaction[]>();
  for (const t of txns) {
    const list = byItem.get(t.itemId) ?? [];
    list.push(t);
    byItem.set(t.itemId, list);
  }
  res.json(
    items.map((i) => toInventoryItem(i, balancesForItem(i, byItem.get(i.id) ?? []))),
  );
});

// GET /inventory/transactions — the immutable ledger, newest first.
router.get(
  "/inventory/transactions",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const q = ListInventoryTransactionsQueryParams.safeParse(req.query);
    const itemId = q.success ? q.data.itemId : undefined;
    const where = itemId
      ? and(
          eq(inventoryTransactionsTable.tenantId, user.tenantId),
          eq(inventoryTransactionsTable.itemId, itemId),
        )
      : eq(inventoryTransactionsTable.tenantId, user.tenantId);
    const rows = await db
      .select()
      .from(inventoryTransactionsTable)
      .where(where)
      .orderBy(inventoryTransactionsTable.createdAt);
    res.json(rows.reverse().map(toInventoryTransaction));
  },
);

// Shared reader: load an item within a tx with a row lock, or return null.
async function respondWithItem(
  res: import("express").Response,
  tenantId: string,
  itemId: string,
) {
  const [item] = await db
    .select()
    .from(inventoryTable)
    .where(and(eq(inventoryTable.id, itemId), eq(inventoryTable.tenantId, tenantId)));
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  const txns = await db
    .select()
    .from(inventoryTransactionsTable)
    .where(
      and(
        eq(inventoryTransactionsTable.tenantId, tenantId),
        eq(inventoryTransactionsTable.itemId, itemId),
      ),
    );
  res.json(toInventoryItem(item, balancesForItem(item, txns)));
}

function guard(req: import("express").Request, res: import("express").Response) {
  const user = req.user!;
  if (!isValidRole(user.role) || !canManageInventory(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  // Narrow role to Role for the privileged-override checks in the callers.
  return { ...user, role: user.role as Role };
}

// POST /inventory/transfers — move stock between locations.
router.post("/inventory/transfers", requireAuth, async (req, res): Promise<void> => {
  const user = guard(req, res);
  if (!user) return;
  const parsed = CreateInventoryTransferBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid transfer" });
    return;
  }
  const d = parsed.data;
  const privileged = canOverrideStock(user.role);
  try {
    const out = await db.transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(inventoryTable)
        .where(
          and(eq(inventoryTable.id, d.itemId), eq(inventoryTable.tenantId, user.tenantId)),
        )
        .for("update");
      if (!item) return { notFound: true as const };
      const { transaction } = await postTransaction(tx, {
        tenantId: user.tenantId,
        itemId: d.itemId,
        type: "transfer",
        location: d.fromLocation,
        quantity: -d.quantity,
        toLocation: d.toLocation,
        reason: d.reason ?? null,
        override: d.override,
        privileged,
        actorUserId: user.id,
        actorName: user.name,
      });
      return { item, transaction };
    });
    if ("notFound" in out) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Inventory Transfer",
        entityType: "Inventory",
        entityId: d.itemId,
        summary: `${d.quantity}× ${out.item.name}: ${d.fromLocation} → ${d.toLocation}`,
        ip: req.ip ?? null,
      },
      req,
    );
    await respondWithItem(res, user.tenantId, d.itemId);
  } catch (err) {
    if (err instanceof NegativeStockError) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "Failed to transfer inventory");
    res.status(500).json({ error: "Failed to transfer inventory" });
  }
});

// POST /inventory/reservations — reserve stock (available drops, on-hand holds).
router.post(
  "/inventory/reservations",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = guard(req, res);
    if (!user) return;
    const parsed = CreateInventoryReservationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid reservation" });
      return;
    }
    const d = parsed.data;
    const privileged = canOverrideStock(user.role);
    try {
      const out = await db.transaction(async (tx) => {
        const [item] = await tx
          .select()
          .from(inventoryTable)
          .where(
            and(
              eq(inventoryTable.id, d.itemId),
              eq(inventoryTable.tenantId, user.tenantId),
            ),
          )
          .for("update");
        if (!item) return { notFound: true as const };
        await postTransaction(tx, {
          tenantId: user.tenantId,
          itemId: d.itemId,
          type: "reservation",
          location: d.location,
          quantity: 0,
          reservedDelta: d.quantity,
          workOrderId: d.workOrderId ?? null,
          reason: d.reason ?? null,
          override: d.override,
          privileged,
          actorUserId: user.id,
          actorName: user.name,
        });
        return { item };
      });
      if ("notFound" in out) {
        res.status(404).json({ error: "Item not found" });
        return;
      }
      await writeAudit(
        {
          tenantId: user.tenantId,
          actorUserId: user.id,
          actorName: user.name,
          action: "Inventory Reserved",
          entityType: "Inventory",
          entityId: d.itemId,
          summary: `Reserved ${d.quantity}× ${out.item.name} @ ${d.location}`,
          ip: req.ip ?? null,
        },
        req,
      );
      await respondWithItem(res, user.tenantId, d.itemId);
    } catch (err) {
      if (err instanceof NegativeStockError) {
        res.status(400).json({ error: err.message });
        return;
      }
      req.log.error({ err }, "Failed to reserve inventory");
      res.status(500).json({ error: "Failed to reserve inventory" });
    }
  },
);

// POST /inventory/reservations/release — release a prior reservation.
router.post(
  "/inventory/reservations/release",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = guard(req, res);
    if (!user) return;
    const parsed = ReleaseInventoryReservationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid release" });
      return;
    }
    const d = parsed.data;
    try {
      const out = await db.transaction(async (tx) => {
        const [item] = await tx
          .select()
          .from(inventoryTable)
          .where(
            and(
              eq(inventoryTable.id, d.itemId),
              eq(inventoryTable.tenantId, user.tenantId),
            ),
          )
          .for("update");
        if (!item) return { notFound: true as const };
        await postTransaction(tx, {
          tenantId: user.tenantId,
          itemId: d.itemId,
          type: "release",
          location: d.location,
          quantity: 0,
          reservedDelta: -d.quantity,
          workOrderId: d.workOrderId ?? null,
          reason: d.reason ?? null,
          // Releasing a reservation only DECREASES `reserved` (increasing
          // available), so it can never cause a shortfall — the guard never
          // fires. No override needed or granted.
          override: false,
          privileged: false,
          actorUserId: user.id,
          actorName: user.name,
        });
        return { item };
      });
      if ("notFound" in out) {
        res.status(404).json({ error: "Item not found" });
        return;
      }
      await writeAudit(
        {
          tenantId: user.tenantId,
          actorUserId: user.id,
          actorName: user.name,
          action: "Inventory Released",
          entityType: "Inventory",
          entityId: d.itemId,
          summary: `Released ${d.quantity}× ${out.item.name} @ ${d.location}`,
          ip: req.ip ?? null,
        },
        req,
      );
      await respondWithItem(res, user.tenantId, d.itemId);
    } catch (err) {
      req.log.error({ err }, "Failed to release inventory");
      res.status(500).json({ error: "Failed to release inventory" });
    }
  },
);

// POST /inventory/adjustments — manual signed correction.
router.post(
  "/inventory/adjustments",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = guard(req, res);
    if (!user) return;
    const parsed = CreateInventoryAdjustmentBody.safeParse(req.body);
    if (!parsed.success || parsed.data.quantity === 0) {
      res.status(400).json({ error: "Invalid adjustment" });
      return;
    }
    const d = parsed.data;
    const privileged = canOverrideStock(user.role);
    try {
      const out = await db.transaction(async (tx) => {
        const [item] = await tx
          .select()
          .from(inventoryTable)
          .where(
            and(
              eq(inventoryTable.id, d.itemId),
              eq(inventoryTable.tenantId, user.tenantId),
            ),
          )
          .for("update");
        if (!item) return { notFound: true as const };
        await postTransaction(tx, {
          tenantId: user.tenantId,
          itemId: d.itemId,
          type: "adjustment",
          location: d.location,
          quantity: d.quantity,
          reason: d.reason ?? null,
          override: d.override,
          privileged,
          actorUserId: user.id,
          actorName: user.name,
        });
        return { item };
      });
      if ("notFound" in out) {
        res.status(404).json({ error: "Item not found" });
        return;
      }
      await writeAudit(
        {
          tenantId: user.tenantId,
          actorUserId: user.id,
          actorName: user.name,
          action: "Inventory Adjusted",
          entityType: "Inventory",
          entityId: d.itemId,
          summary: `${d.quantity > 0 ? "+" : ""}${d.quantity} ${out.item.name} @ ${d.location}`,
          ip: req.ip ?? null,
        },
        req,
      );
      await respondWithItem(res, user.tenantId, d.itemId);
    } catch (err) {
      if (err instanceof NegativeStockError) {
        res.status(400).json({ error: err.message });
        return;
      }
      req.log.error({ err }, "Failed to adjust inventory");
      res.status(500).json({ error: "Failed to adjust inventory" });
    }
  },
);

// POST /inventory/cycle-counts — reconcile counted quantity to a signed delta.
router.post(
  "/inventory/cycle-counts",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = guard(req, res);
    if (!user) return;
    const parsed = CreateInventoryCycleCountBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid cycle count" });
      return;
    }
    const d = parsed.data;
    const privileged = canOverrideStock(user.role);
    try {
      const out = await db.transaction(async (tx) => {
        const [item] = await tx
          .select()
          .from(inventoryTable)
          .where(
            and(
              eq(inventoryTable.id, d.itemId),
              eq(inventoryTable.tenantId, user.tenantId),
            ),
          )
          .for("update");
        if (!item) return { notFound: true as const };
        const txns = await tx
          .select()
          .from(inventoryTransactionsTable)
          .where(
            and(
              eq(inventoryTransactionsTable.tenantId, user.tenantId),
              eq(inventoryTransactionsTable.itemId, d.itemId),
            ),
          );
        const current =
          balancesForItem(item, txns).byLocation.get(d.location)?.onHand ?? 0;
        const delta = d.countedQuantity - current;
        if (delta !== 0) {
          await postTransaction(tx, {
            tenantId: user.tenantId,
            itemId: d.itemId,
            type: "cycle_count",
            location: d.location,
            quantity: delta,
            reason: d.reason ?? `Counted ${d.countedQuantity}`,
            // A cycle count reconciles to a physically counted (>= 0) quantity,
            // so on-hand can never go negative. If the count is below what's
            // reserved, that rare shortfall requires an EXPLICIT override from a
            // privileged user — role authorizes, it does not auto-trigger.
            override: Boolean(d.override),
            privileged,
            actorUserId: user.id,
            actorName: user.name,
          });
        }
        return { item, delta };
      });
      if ("notFound" in out) {
        res.status(404).json({ error: "Item not found" });
        return;
      }
      await writeAudit(
        {
          tenantId: user.tenantId,
          actorUserId: user.id,
          actorName: user.name,
          action: "Cycle Count",
          entityType: "Inventory",
          entityId: d.itemId,
          summary: `${out.item.name} @ ${d.location}: counted ${d.countedQuantity} (${out.delta >= 0 ? "+" : ""}${out.delta})`,
          ip: req.ip ?? null,
        },
        req,
      );
      await respondWithItem(res, user.tenantId, d.itemId);
    } catch (err) {
      if (err instanceof NegativeStockError) {
        res.status(400).json({ error: err.message });
        return;
      }
      req.log.error({ err }, "Failed to record cycle count");
      res.status(500).json({ error: "Failed to record cycle count" });
    }
  },
);

export default router;
