export const SESSION_COOKIE_NAME = "sc_session";

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Failed-login throttling
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export const isProduction = process.env.NODE_ENV === "production";

/**
 * Runtime production check. Unlike the {@link isProduction} constant (captured at
 * module load), this reads `NODE_ENV` on every call so request handlers reflect
 * the current environment. Used to gate the development-only auth backdoor so its
 * production lockout can be verified by a test.
 */
export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}
