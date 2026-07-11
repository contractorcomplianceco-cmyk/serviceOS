import { Router, type IRouter } from "express";
import { and, eq, isNull, gt, ne } from "drizzle-orm";
import { db, sessionsTable } from "@workspace/db";
import { RevokeSessionParams } from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import { hashToken } from "../lib/auth/tokens";

const router: IRouter = Router();

// GET /sessions — list the current user's active sessions
router.get(
  "/sessions",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const currentHash = hashToken(req.sessionToken!);
    const rows = await db
      .select()
      .from(sessionsTable)
      .where(
        and(
          eq(sessionsTable.userId, user.id),
          isNull(sessionsTable.revokedAt),
          gt(sessionsTable.expiresAt, new Date()),
        ),
      )
      .orderBy(sessionsTable.createdAt);

    res.json(
      rows.map((s) => ({
        id: s.id,
        ip: s.ip ?? null,
        userAgent: s.userAgent ?? null,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        current: s.tokenHash === currentHash,
      })),
    );
  },
);

// POST /sessions/revoke-others — revoke every session except the current one
router.post(
  "/sessions/revoke-others",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const currentHash = hashToken(req.sessionToken!);
    await db
      .update(sessionsTable)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(sessionsTable.userId, user.id),
          isNull(sessionsTable.revokedAt),
          ne(sessionsTable.tokenHash, currentHash),
        ),
      );
    res.sendStatus(204);
  },
);

// DELETE /sessions/:id — revoke a specific session belonging to the user
router.delete(
  "/sessions/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = RevokeSessionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const user = req.user!;
    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, params.data.id));
    if (!session || session.userId !== user.id) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    await db
      .update(sessionsTable)
      .set({ revokedAt: new Date() })
      .where(eq(sessionsTable.id, session.id));
    res.sendStatus(204);
  },
);

export default router;
