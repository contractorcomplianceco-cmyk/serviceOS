import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { toAuthUser } from "../lib/serialize";

const router: IRouter = Router();

// GET /employees — tenant-scoped directory. Any authenticated user needs this
// to resolve technician/manager names and populate assignment pickers.
router.get(
  "/employees",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.tenantId, user.tenantId))
      .orderBy(usersTable.createdAt);
    res.json(rows.map(toAuthUser));
  },
);

export default router;
