import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";
import { globalSearch } from "../lib/search";

const router: IRouter = Router();

router.get(
  "/search",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const results = await globalSearch(user, q);
    res.json({ query: q, results });
  },
);

export default router;
