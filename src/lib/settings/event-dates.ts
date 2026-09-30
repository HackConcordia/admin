/**
 * Settings dates are stored by hand in MongoDB (ISO 8601 with an explicit Montreal offset is
 * recommended, e.g. "2027-01-20T23:59:00-05:00") and only ever displayed by the admin, always in
 * Montreal time whatever the zone of the server. Read-only: nothing here writes a date.
 */
import { parseSettingsDate } from "@/lib/settings/parse-settings-date";

export const EVENT_TIME_ZONE = "America/Toronto";

const DISPLAY = new Intl.DateTimeFormat("en-US", {
  timeZone: EVENT_TIME_ZONE,
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

/** e.g. "Wednesday, January 20, 2027 at 11:59 PM EST". Text that doesn't parse is shown as stored; empty gives null. */
export function formatSettingsDate(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : DISPLAY.format(value);
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = parseSettingsDate(value);
  return date ? DISPLAY.format(date) : value.trim();
}
