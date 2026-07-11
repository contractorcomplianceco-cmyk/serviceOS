import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  invitationsTable,
  type User,
} from "@workspace/db";
import {
  InviteUserBody,
  AcceptInviteBody,
  UpdateUserBody,
  UpdateUserParams,
  AdminResetUserPasswordParams,
} from "@workspace/api-zod";
import { requireAuth, requireRoles } from "../middleware/auth";
import { toAuthUser } from "../lib/serialize";
import { hashPassword, isPasswordStrongEnough } from "../lib/auth/password";
import { generateToken, hashToken } from "../lib/auth/tokens";
import { revokeAllUserSessions } from "../lib/auth/session";
import { INVITE_TTL_MS, isProduction } from "../lib/auth/config";
import { isValidRole } from "../lib/authz";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

// GET /users — admin lists everyone in their tenant
router.get(
  "/users",
  requireAuth,
  requireRoles("Administrator"),
  async (req, res): Promise<void> => {
    const admin = req.user!;
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.tenantId, admin.tenantId))
      .orderBy(usersTable.createdAt);
    res.json(users.map(toAuthUser));
  },
);

// POST /users/invite — admin invites a new user
router.post(
  "/users/invite",
  requireAuth,
  requireRoles("Administrator"),
  async (req, res): Promise<void> => {
    const parsed = InviteUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    if (!isValidRole(parsed.data.role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }
    const admin = req.user!;
    const email = parsed.data.email.toLowerCase();

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    if (existing) {
      res.status(400).json({ error: "A user with that email already exists" });
      return;
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    const [invitation] = await db
      .insert(invitationsTable)
      .values({
        tenantId: admin.tenantId,
        email,
        name: parsed.data.name,
        role: parsed.data.role,
        customerId: parsed.data.customerId ?? null,
        tokenHash: hashToken(token),
        invitedByUserId: admin.id,
        expiresAt,
      })
      .returning();

    await writeAudit(
      {
        tenantId: admin.tenantId,
        actorUserId: admin.id,
        actorName: admin.name,
        action: "user_invite",
        entityType: "User",
        entityId: invitation.id,
        summary: `${admin.name} invited ${email} as ${parsed.data.role}`,
        ip: req.ip ?? null,
      },
      req,
    );

    res.status(201).json({
      id: invitation.id,
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      devToken: isProduction ? null : token,
    });
  },
);

// POST /users/accept-invite — public; activates the invited account
router.post("/users/accept-invite", async (req, res): Promise<void> => {
  const parsed = AcceptInviteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!isPasswordStrongEnough(parsed.data.password)) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const tokenHash = hashToken(parsed.data.token);
  const [invitation] = await db
    .select()
    .from(invitationsTable)
    .where(eq(invitationsTable.tokenHash, tokenHash));

  if (
    !invitation ||
    invitation.acceptedAt ||
    invitation.expiresAt.getTime() < Date.now()
  ) {
    res.status(400).json({ error: "Invalid or expired invitation" });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const [user] = await db
    .insert(usersTable)
    .values({
      tenantId: invitation.tenantId,
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      customerId: invitation.customerId ?? null,
      passwordHash,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    })
    .returning();

  await db
    .update(invitationsTable)
    .set({ acceptedAt: new Date() })
    .where(eq(invitationsTable.id, invitation.id));

  await writeAudit(
    {
      tenantId: invitation.tenantId,
      actorUserId: user.id,
      actorName: user.name,
      action: "invite_accepted",
      entityType: "User",
      entityId: user.id,
      summary: `${user.email} accepted their invitation`,
      ip: req.ip ?? null,
    },
    req,
  );
  res.sendStatus(204);
});

// PATCH /users/:id — admin updates a user
router.patch(
  "/users/:id",
  requireAuth,
  requireRoles("Administrator"),
  async (req, res): Promise<void> => {
    const params = UpdateUserParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    if (parsed.data.role !== undefined && !isValidRole(parsed.data.role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }
    const admin = req.user!;

    const [target] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, params.data.id));
    if (!target || target.tenantId !== admin.tenantId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const updates: Partial<User> = {};
    const d = parsed.data;
    if (d.name !== undefined) updates.name = d.name;
    if (d.role !== undefined) updates.role = d.role;
    if (d.active !== undefined) updates.active = d.active;
    if (d.mustResetPassword !== undefined)
      updates.mustResetPassword = d.mustResetPassword;
    if (d.phone !== undefined) updates.phone = d.phone;
    if (d.zone !== undefined) updates.zone = d.zone;
    if (d.skills !== undefined) updates.skills = d.skills;
    if (d.restrictedTasks !== undefined)
      updates.restrictedTasks = d.restrictedTasks;
    if (d.workloadHours !== undefined) updates.workloadHours = d.workloadHours;
    if (d.capacityHours !== undefined) updates.capacityHours = d.capacityHours;
    if (d.truckId !== undefined) updates.truckId = d.truckId;
    if (d.gpsConsent !== undefined) updates.gpsConsent = d.gpsConsent;
    if (d.hourlyCost !== undefined) updates.hourlyCost = d.hourlyCost;

    const [updated] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, target.id))
      .returning();

    // Disabling an account terminates its sessions immediately.
    if (d.active === false) {
      await revokeAllUserSessions(target.id);
    }

    await writeAudit(
      {
        tenantId: admin.tenantId,
        actorUserId: admin.id,
        actorName: admin.name,
        action: "user_update",
        entityType: "User",
        entityId: target.id,
        summary: `${admin.name} updated ${updated.email}`,
        metadata: { fields: Object.keys(updates) },
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toAuthUser(updated));
  },
);

// POST /users/:id/reset-password — admin forces a password reset
router.post(
  "/users/:id/reset-password",
  requireAuth,
  requireRoles("Administrator"),
  async (req, res): Promise<void> => {
    const params = AdminResetUserPasswordParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const admin = req.user!;
    const [target] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, params.data.id));
    if (!target || target.tenantId !== admin.tenantId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await db
      .update(usersTable)
      .set({ mustResetPassword: true })
      .where(eq(usersTable.id, target.id));
    await revokeAllUserSessions(target.id);

    await writeAudit(
      {
        tenantId: admin.tenantId,
        actorUserId: admin.id,
        actorName: admin.name,
        action: "user_force_reset",
        entityType: "User",
        entityId: target.id,
        summary: `${admin.name} forced a password reset for ${target.email}`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.sendStatus(204);
  },
);

export default router;
