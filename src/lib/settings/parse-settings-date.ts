/**
 * Settings dates are written by the admin app as a BSON Date, but this app's Settings schema
 * declares them String, so Mongoose reads back whichever of these shapes is actually stored:
 *   - an ISO string (e.g. "2026-10-01T04:00:00.000Z"), or
 *   - `Date.prototype.toString()` output (a Date cast to String), e.g.
 *     "Thu Oct 01 2026 04:00:00 GMT-0400 (Eastern Daylight Time)", or
 *   - the legacy "November 14th, 2026 (EST)" format (ordinal suffix + short zone label).
 * A real Date is accepted as-is. Anything that doesn't parse returns null so the caller can fail closed.
 *
 * A trailing "(EST)" / "(EDT)" label is honoured as UTC-5 / UTC-4. Without that, the server's own
 * zone would decide the instant, and on Vercel (UTC) the window would be read 4-5 hours early.
 * Other trailing labels (e.g. "(Eastern Daylight Time)", which comes with an explicit GMT offset) are
 * dropped as before.
 */
const ZONE_OFFSETS: Readonly<Record<string, string>> = { EST: "GMT-0500", EDT: "GMT-0400" };

export function parseSettingsDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  if (typeof value !== "string" || value.trim() === "") return null;

  const label = /\s\(([^)]+)\)$/.exec(value.trim())?.[1];
  const offset = label ? ZONE_OFFSETS[label.toUpperCase()] : undefined;
  const normalized = value
    .trim()
    .replace(/\s\([^)]+\)$/, "")
    .replace(/(\d+)(st|nd|rd|th)/, "$1");
  const date = new Date(offset ? `${normalized} ${offset}` : normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}
