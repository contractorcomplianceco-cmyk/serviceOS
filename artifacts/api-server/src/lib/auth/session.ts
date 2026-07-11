import type { Response } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, sessionsTable, usersTable, type User } from "@workspace/db";
import { generateToken, hashToken } from "./tokens";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  isProduction,
} from "./config";

export interface CreateSessionArgs {
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
}

/** Create a session row and return the raw token to place in the cookie. */
export async function createSession(
  args: CreateSessionArgs,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessionsTable).values({
    userId: args.userId,
    tokenHash,
    ip: args.ip ?? null,
    userAgent: args.userAgent ?? null,
    expiresAt,
  });

  return { token, expiresAt };
}

/** Look up the active (non-expired, non-revoked) user for a raw token. */
export async function getUserForToken(token: string): Promise<User | null> {
  const tokenHash = hashToken(token);
  const [row] = await db
    .select({ user: usersTable })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(
      and(
        eq(sessionsTable.tokenHash, tokenHash),
        isNull(sessionsTable.revokedAt),
        gt(sessionsTable.expiresAt, new Date()),
      ),
    );
  if (!row) return null;
  if (!row.user.active) return null;
  return row.user;
}

/** Revoke a single session identified by its raw token. */
export async function revokeSessionByToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await db
    .update(sessionsTable)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(sessionsTable.tokenHash, tokenHash), isNull(sessionsTable.revokedAt)),
    );
}

/** Revoke every active session for a user (e.g. after password reset). */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await db
    .update(sessionsTable)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(sessionsTable.userId, userId), isNull(sessionsTable.revokedAt)),
    );
}

export function setSessionCookie(
  res: Response,
  token: string,
  expiresAt: Date,
): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });
}
