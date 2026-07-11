import { Router, type IRouter } from "express";
import { and, eq, isNull, gt } from "drizzle-orm";
import {
  db,
  usersTable,
  passwordResetTokensTable,
  type User,
} from "@workspace/db";
import {
  LoginBody,
  ChangePasswordBody,
  RequestPasswordResetBody,
  ConfirmPasswordResetBody,
  DevLoginBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import { toAuthUser } from "../lib/serialize";
import {
  hashPassword,
  verifyPassword,
  isPasswordStrongEnough,
} from "../lib/auth/password";
import { generateToken, hashToken } from "../lib/auth/tokens";
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
  revokeSessionByToken,
  revokeAllUserSessions,
  getUserForToken,
} from "../lib/auth/session";
import {
  recordLoginAttempt,
  isLockedOut,
  registerFailure,
  resetFailures,
} from "../lib/auth/throttle";
import {
  SESSION_COOKIE_NAME,
  RESET_TTL_MS,
  isProduction,
} from "../lib/auth/config";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

const INVALID = "Invalid email or password";

async function findByEmail(email: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));
  return user;
}

async function establishSession(
  res: import("express").Response,
  req: import("express").Request,
  user: User,
  action: string,
): Promise<void> {
  const { token, expiresAt } = await createSession({
    userId: user.id,
    ip: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
  });
  setSessionCookie(res, token, expiresAt);
  await writeAudit(
    {
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorName: user.name,
      action,
      entityType: "Auth",
      entityId: user.id,
      summary: `${user.name} signed in`,
      ip: req.ip ?? null,
    },
    req,
  );
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const email = parsed.data.email.toLowerCase();
  const ip = req.ip ?? null;
  const user = await findByEmail(email);

  if (!user || !user.active || !user.passwordHash) {
    await recordLoginAttempt(email, ip, false);
    res.status(401).json({ error: INVALID });
    return;
  }

  if (isLockedOut(user)) {
    await recordLoginAttempt(email, ip, false);
    res
      .status(401)
      .json({ error: "Account temporarily locked. Try again later." });
    return;
  }

  const ok = await verifyPassword(
    user.passwordHash,
    user.passwordAlgo,
    parsed.data.password,
  );
  if (!ok) {
    await registerFailure(user);
    await recordLoginAttempt(email, ip, false);
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "login_failed",
        entityType: "Auth",
        entityId: user.id,
        summary: `Failed sign-in attempt for ${user.email}`,
        ip,
      },
      req,
    );
    res.status(401).json({ error: INVALID });
    return;
  }

  await resetFailures(user.id);
  await recordLoginAttempt(email, ip, true);
  await establishSession(res, req, user, "login");
  res.status(200).json(toAuthUser({ ...user, lastLoginAt: new Date() }));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof token === "string" && token.length > 0) {
    const user = await getUserForToken(token);
    await revokeSessionByToken(token);
    if (user) {
      await writeAudit(
        {
          tenantId: user.tenantId,
          actorUserId: user.id,
          actorName: user.name,
          action: "logout",
          entityType: "Auth",
          entityId: user.id,
          summary: `${user.name} signed out`,
          ip: req.ip ?? null,
        },
        req,
      );
    }
  }
  clearSessionCookie(res);
  res.sendStatus(204);
});

router.get(
  "/auth/me",
  requireAuth,
  async (req, res): Promise<void> => {
    res.json(toAuthUser(req.user!));
  },
);

router.post(
  "/auth/change-password",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = ChangePasswordBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const user = req.user!;
    if (!user.passwordHash) {
      res.status(401).json({ error: "Password change not allowed" });
      return;
    }
    const ok = await verifyPassword(
      user.passwordHash,
      user.passwordAlgo,
      parsed.data.currentPassword,
    );
    if (!ok) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
    if (!isPasswordStrongEnough(parsed.data.newPassword)) {
      res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
      return;
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await db
      .update(usersTable)
      .set({ passwordHash, mustResetPassword: false })
      .where(eq(usersTable.id, user.id));

    // Invalidate all sessions, then re-establish the current device.
    await revokeAllUserSessions(user.id);
    await establishSession(res, req, user, "password_change");
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "password_change",
        entityType: "Auth",
        entityId: user.id,
        summary: `${user.name} changed their password`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.sendStatus(204);
  },
);

router.post("/auth/password-reset/request", async (req, res): Promise<void> => {
  const parsed = RequestPasswordResetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const email = parsed.data.email.toLowerCase();
  const user = await findByEmail(email);

  let devToken: string | null = null;
  if (user && user.active) {
    const token = generateToken();
    devToken = isProduction ? null : token;
    await db.insert(passwordResetTokensTable).values({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    });
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "password_reset_request",
        entityType: "Auth",
        entityId: user.id,
        summary: `Password reset requested for ${user.email}`,
        ip: req.ip ?? null,
      },
      req,
    );
  }

  res.status(202).json({
    message:
      "If an account exists for that email, a reset link has been sent.",
    devToken,
  });
});

router.post("/auth/password-reset/confirm", async (req, res): Promise<void> => {
  const parsed = ConfirmPasswordResetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!isPasswordStrongEnough(parsed.data.newPassword)) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const tokenHash = hashToken(parsed.data.token);
  const [row] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.tokenHash, tokenHash),
        isNull(passwordResetTokensTable.usedAt),
        gt(passwordResetTokensTable.expiresAt, new Date()),
      ),
    );
  if (!row) {
    res.status(400).json({ error: "Invalid or expired token" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, row.userId));
  if (!user) {
    res.status(400).json({ error: "Invalid or expired token" });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db
    .update(usersTable)
    .set({
      passwordHash,
      mustResetPassword: false,
      failedLoginCount: 0,
      lockedUntil: null,
    })
    .where(eq(usersTable.id, user.id));
  await db
    .update(passwordResetTokensTable)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokensTable.id, row.id));
  await revokeAllUserSessions(user.id);
  await writeAudit(
    {
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorName: user.name,
      action: "password_reset",
      entityType: "Auth",
      entityId: user.id,
      summary: `Password reset completed for ${user.email}`,
      ip: req.ip ?? null,
    },
    req,
  );
  res.sendStatus(204);
});

// --- Development-only role switcher -----------------------------------------

router.get("/auth/dev-users", async (_req, res): Promise<void> => {
  if (isProduction) {
    res.status(403).json({ error: "Disabled in production" });
    return;
  }
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.active, true));
  res.json(
    users
      .filter((u) => u.role !== "Customer Portal User")
      .map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        email: u.email,
      })),
  );
});

router.post("/auth/dev-login", async (req, res): Promise<void> => {
  if (isProduction) {
    res.status(403).json({ error: "Disabled in production" });
    return;
  }
  const parsed = DevLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, parsed.data.userId));
  if (!user || !user.active) {
    res.status(403).json({ error: "Disabled in production" });
    return;
  }
  await resetFailures(user.id);
  await establishSession(res, req, user, "dev_login");
  res.status(200).json(toAuthUser({ ...user, lastLoginAt: new Date() }));
});

export default router;
