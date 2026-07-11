import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { HealthCheckResponse, ReadinessCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/readyz", async (req, res): Promise<void> => {
  try {
    await db.execute(sql`select 1`);
    res.json(ReadinessCheckResponse.parse({ status: "ok", database: "ok" }));
  } catch (err) {
    req.log.error({ err }, "Readiness check failed: database unreachable");
    res
      .status(503)
      .json(
        ReadinessCheckResponse.parse({ status: "error", database: "error" }),
      );
  }
});

export default router;
