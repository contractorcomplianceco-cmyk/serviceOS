import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set for auth token hashing.");
}
const SECRET: string = SESSION_SECRET;

/** Generate a high-entropy opaque token (URL-safe) sent to the client. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Keyed hash of a token for storage. Uses HMAC-SHA256 with SESSION_SECRET so a
 * database leak alone cannot be used to forge sessions/reset tokens.
 */
export function hashToken(token: string): string {
  return createHmac("sha256", SECRET).update(token).digest("hex");
}

/** Constant-time comparison of two hex hashes. */
export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
