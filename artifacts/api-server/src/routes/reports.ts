import { Router, type IRouter } from "express";
import { requireAuth, requireNav } from "../middleware/auth";
import { buildReports } from "../lib/reports";

const router: IRouter = Router();

router.get(
  "/reports",
  requireAuth,
  requireNav("reports"),
  async (req, res): Promise<void> => {
    const user = req.user!;
    const reports = await buildReports(user.tenantId);
    res.json(reports);
  },
);

export default router;
