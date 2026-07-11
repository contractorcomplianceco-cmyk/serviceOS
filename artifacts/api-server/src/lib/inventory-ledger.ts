import { and, eq } from "drizzle-orm";
import {
  inventoryTransactionsTable,
  inventoryTable,
  type InventoryTransaction,
  type Inventory,
} from "@workspace/db";

// The inventory ledger is the source of truth. Balances are DERIVED by folding
// the immutable transaction rows — never mutated in place. Sign convention:
//   quantity      = signed on-hand delta at `location`
//   reservedDelta = signed reserved delta at `location`
//   toLocation    = optional mirror target that receives the opposite on-hand
//                   delta (used by transfers/assignments)

export interface LocationBalance {
  location: string;
  onHand: number;
  reserved: number;
  available: number;
}

export interface DerivedBalances {
  onHand: number;
  reserved: number;
  available: number;
  locationBalances: LocationBalance[];
  byLocation: Map<string, { onHand: number; reserved: number }>;
}

export function deriveBalances(
  txns: Pick<
    InventoryTransaction,
    "quantity" | "reservedDelta" | "location" | "toLocation"
  >[],
): DerivedBalances {
  const byLocation = new Map<string, { onHand: number; reserved: number }>();
  const bucket = (loc: string) => {
    let b = byLocation.get(loc);
    if (!b) {
      b = { onHand: 0, reserved: 0 };
      byLocation.set(loc, b);
    }
    return b;
  };

  for (const t of txns) {
    const here = bucket(t.location);
    here.onHand += t.quantity;
    here.reserved += t.reservedDelta;
    if (t.toLocation) {
      bucket(t.toLocation).onHand += -t.quantity;
    }
  }

  const locationBalances: LocationBalance[] = [...byLocation.entries()]
    .map(([location, b]) => ({
      location,
      onHand: b.onHand,
      reserved: b.reserved,
      available: b.onHand - b.reserved,
    }))
    .sort((a, b) => a.location.localeCompare(b.location));

  const onHand = locationBalances.reduce((s, b) => s + b.onHand, 0);
  const reserved = locationBalances.reduce((s, b) => s + b.reserved, 0);
  return {
    onHand,
    reserved,
    available: onHand - reserved,
    locationBalances,
    byLocation,
  };
}

/**
 * Balances for an item, folding its ledger. If the item has no transactions yet
 * (legacy seed rows predate the ledger), fall back to treating the denormalized
 * `quantity` as an opening balance at the item's home location so reads stay
 * correct until an opening transaction is posted.
 */
export function balancesForItem(
  item: Pick<Inventory, "quantity" | "location">,
  txns: Pick<
    InventoryTransaction,
    "quantity" | "reservedDelta" | "location" | "toLocation"
  >[],
): DerivedBalances {
  if (txns.length === 0) {
    return deriveBalances([
      {
        quantity: item.quantity,
        reservedDelta: 0,
        location: item.location,
        toLocation: null,
      },
    ]);
  }
  return deriveBalances(txns);
}

export class NegativeStockError extends Error {
  constructor(
    message: string,
    readonly location: string,
  ) {
    super(message);
    this.name = "NegativeStockError";
  }
}

export interface PostTransactionInput {
  tenantId: string;
  itemId: string;
  type: string;
  location: string;
  quantity: number;
  reservedDelta?: number;
  toLocation?: string | null;
  workOrderId?: string | null;
  purchaseRequestId?: string | null;
  reason?: string | null;
  override?: boolean;
  privileged?: boolean;
  actorUserId?: string | null;
  actorName: string;
}

// Any drizzle transaction handle. Kept loose to avoid coupling to the concrete
// PgTransaction generics.
type Tx = {
  select: typeof import("@workspace/db").db.select;
  insert: typeof import("@workspace/db").db.insert;
  update: typeof import("@workspace/db").db.update;
};

/**
 * Post one or more ledger rows for an item inside an existing DB transaction.
 * Enforces negative-stock protection unless an override is requested by a
 * privileged caller. Returns the inserted transaction row and the item row with
 * its denormalized `quantity` (total on-hand) kept in sync for legacy readers.
 *
 * The caller MUST have locked the item row (`.for("update")`) beforehand so the
 * derived balance check is race-free.
 */
export async function postTransaction(
  tx: Tx,
  input: PostTransactionInput,
): Promise<{ transaction: InventoryTransaction; item: Inventory }> {
  const existing = await tx
    .select()
    .from(inventoryTransactionsTable)
    .where(
      and(
        eq(inventoryTransactionsTable.tenantId, input.tenantId),
        eq(inventoryTransactionsTable.itemId, input.itemId),
      ),
    );

  const reservedDelta = input.reservedDelta ?? 0;
  const projected = deriveBalances([
    ...existing,
    {
      quantity: input.quantity,
      reservedDelta,
      location: input.location,
      toLocation: input.toLocation ?? null,
    },
  ]);

  const overrideAllowed = Boolean(input.override && input.privileged);
  if (!overrideAllowed) {
    // Only guard the locations this transaction actually DECREASES. A purely
    // additive leg (a receipt, or the incoming leg of a transfer) can never
    // cause a shortfall, so it must never be blocked even if the location was
    // already negative (e.g. from a prior privileged override).
    const touched = [input.location, input.toLocation].filter(
      (l): l is string => Boolean(l),
    );
    for (const loc of touched) {
      const b = projected.byLocation.get(loc);
      if (!b) continue;
      // Net on-hand delta this row applies at `loc`.
      const onHandDelta =
        (loc === input.location ? input.quantity : 0) +
        (loc === input.toLocation ? -input.quantity : 0);
      const reservedDeltaHere = loc === input.location ? reservedDelta : 0;
      if (onHandDelta < 0 && b.onHand < 0) {
        throw new NegativeStockError(
          `On-hand would go negative at ${loc}`,
          loc,
        );
      }
      if (
        (onHandDelta < 0 || reservedDeltaHere > 0) &&
        b.onHand - b.reserved < 0
      ) {
        throw new NegativeStockError(
          `Available would go negative at ${loc}`,
          loc,
        );
      }
    }
  }

  const [transaction] = await tx
    .insert(inventoryTransactionsTable)
    .values({
      tenantId: input.tenantId,
      itemId: input.itemId,
      type: input.type,
      quantity: input.quantity,
      reservedDelta,
      location: input.location,
      toLocation: input.toLocation ?? null,
      workOrderId: input.workOrderId ?? null,
      purchaseRequestId: input.purchaseRequestId ?? null,
      reason: input.reason ?? null,
      overridden: overrideAllowed && Boolean(input.override),
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName,
    })
    .returning();

  const isConsumption = input.quantity < 0 && !input.toLocation;
  const [item] = await tx
    .update(inventoryTable)
    .set({
      quantity: projected.onHand,
      ...(isConsumption ? { lastUsed: new Date() } : {}),
    })
    .where(eq(inventoryTable.id, input.itemId))
    .returning();

  return { transaction: transaction!, item: item! };
}
