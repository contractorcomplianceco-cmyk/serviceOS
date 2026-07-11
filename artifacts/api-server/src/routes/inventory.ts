import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, inventoryTable } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { toInventoryItem } from "../lib/serialize-ops";

const router: IRouter = Router();

// GET /inventory — tenant-scoped list. Read-only for now; full inventory CRUD,
// transfers, and reservations are a downstream task. Available to any
// authenticated user because the work-order material picker needs it.
router.get(
  "/inventory",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const rows = await db
      .select()
      .from(inventoryTable)
      .where(eq(inventoryTable.tenantId, user.tenantId))
      .orderBy(inventoryTable.name);
    res.json(rows.map(toInventoryItem));
  },
);

export default router;
