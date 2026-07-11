// Generated zod request schemas coerce `format: date` fields to JS `Date`
// objects, but our DB date columns are stored as YYYY-MM-DD strings
// (mode: "string"). These helpers normalize inbound values back to strings.

/** Normalize an optional date input to a YYYY-MM-DD string (or null). */
export function toDateStr(
  v: string | Date | null | undefined,
): string | null {
  if (v == null) return null;
  return v instanceof Date ? v.toISOString().slice(0, 10) : v;
}

/** Normalize a required date input to a YYYY-MM-DD string. */
export function reqDateStr(v: string | Date): string {
  return v instanceof Date ? v.toISOString().slice(0, 10) : v;
}

/** Normalize an array of date inputs to YYYY-MM-DD strings. */
export function toDateStrArr(
  v: (string | Date)[] | null | undefined,
): string[] {
  if (!v) return [];
  return v.map((x) => (x instanceof Date ? x.toISOString().slice(0, 10) : x));
}
