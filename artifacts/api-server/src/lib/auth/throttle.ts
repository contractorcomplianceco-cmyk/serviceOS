import { eq } from "drizzle-orm";
import { db, loginAttemptsTable, usersTable, type User } from "@workspace/db";
import { LOCKOUT_MS, MAX_FAILED_ATTEMPTS } from "./config";

export async function recordLoginAttempt(
  email: string,
  ip: string | null,
  success: boolean,
): Promise<void> {
  await db.insert(loginAttemptsTable).values({
    email: email.toLowerCase(),
    ip,
    success,
  });
}

export function isLockedOut(user: User): boolean {
  return !!user.lockedUntil && user.lockedUntil.getTime() > Date.now();
}

/** Record a failed login for a known user; lock the account past the threshold. */
export async function registerFailure(user: User): Promise<void> {
  const nextCount = user.failedLoginCount + 1;
  const lockedUntil =
    nextCount >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null;
  await db
    .update(usersTable)
    .set({ failedLoginCount: nextCount, lockedUntil })
    .where(eq(usersTable.id, user.id));
}

/** Clear failure counters after a successful login. */
export async function resetFailures(userId: string): Promise<void> {
  await db
    .update(usersTable)
    .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(usersTable.id, userId));
}
