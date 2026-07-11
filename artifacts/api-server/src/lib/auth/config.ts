export const SESSION_COOKIE_NAME = "sc_session";

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Failed-login throttling
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export const isProduction = process.env.NODE_ENV === "production";
