import type { CorsOptions } from "cors";

/**
 * Parse the comma-separated `SERVICECONNECT_ALLOWED_ORIGINS` value into a set of
 * exact origins. Whitespace around each entry is trimmed and empty entries are
 * dropped, so trailing commas or padded lists are tolerated. An unset or empty
 * value yields an empty set (i.e. no cross-origin requests are allowed).
 */
export function parseAllowedOrigins(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

/**
 * Build credentialed CORS options backed by an exact-origin allowlist.
 *
 * The allowlist is sourced from `SERVICECONNECT_ALLOWED_ORIGINS` (or an explicit
 * value, for tests). Matching is strict `Set` membership — no wildcards, no
 * subdomain globbing, no substring/prefix matching — so an allowed origin's
 * `Access-Control-Allow-Origin` echoes the exact requested origin and
 * `Access-Control-Allow-Credentials: true` is sent. Disallowed origins receive
 * no `Access-Control-Allow-Origin`, so browsers block the response.
 *
 * Requests without an `Origin` header (same-origin navigations, curl,
 * server-to-server) are permitted: the `cors` package adds no CORS headers for
 * them, so this does not widen browser access.
 */
export function buildCorsOptions(
  raw: string | undefined = process.env.SERVICECONNECT_ALLOWED_ORIGINS,
): CorsOptions {
  const allowedOrigins = parseAllowedOrigins(raw);
  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, allowedOrigins.has(origin));
    },
    credentials: true,
  };
}
