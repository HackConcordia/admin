/** The Settings singleton as the read-only API returns it: known fields only, dates as stored plus Montreal display text. */
import { formatSettingsDate } from "@/lib/settings/event-dates";

export const SETTINGS_DATE_FIELDS = [
  "registrationOpeningDate",
  "registrationClosingDate",
  "confirmationDate",
  "checkInOpeningDate",
  "checkInClosingDate",
] as const;
export type SettingsDateField = (typeof SETTINGS_DATE_FIELDS)[number];

export interface SettingsDateView {
  stored: string | null;
  display: string | null;
}

export interface SettingsView {
  dates: Record<SettingsDateField, SettingsDateView>;
  maxCapacity: number | null;
}

function storedText(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export function toSettingsView(doc: Record<string, unknown> | null | undefined): SettingsView {
  const dates = Object.fromEntries(
    SETTINGS_DATE_FIELDS.map((field) => {
      const stored = storedText(doc?.[field]);
      return [field, { stored, display: formatSettingsDate(stored) }];
    }),
  ) as Record<SettingsDateField, SettingsDateView>;
  const capacity = doc?.maxCapacity;
  return { dates, maxCapacity: typeof capacity === "number" && Number.isFinite(capacity) ? capacity : null };
}
