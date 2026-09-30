/** Contract C4: canonical checked-in status written by every check-in path. */
export const CHECKED_IN_STATUS = "Checked-in" as const;

/** Legacy value still present in older documents; read-compatible only. */
export const LEGACY_CHECKED_IN_STATUS = "CheckedIn" as const;

export const CHECKED_IN_STATUSES: readonly string[] = [CHECKED_IN_STATUS, LEGACY_CHECKED_IN_STATUS];

export const APPLICATION_STATUSES = [
  "Unverified",
  "Incomplete",
  "Submitted",
  "Admitted",
  "Waitlisted",
  "Confirmed",
  "Declined",
  "Checked-in",
  "CheckedIn",
  "Refused",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export function isCheckedInStatus(status: unknown): boolean {
  if (typeof status !== "string") return false;
  return status.trim().toLowerCase().replace(/[\s_-]/g, "") === "checkedin";
}

/** Folds every checked-in spelling into the canonical key. Returns a new object. */
export function mergeCheckedInCounts(counts: Readonly<Record<string, number>>): Record<string, number> {
  return Object.entries(counts).reduce<Record<string, number>>(
    (merged, [status, count]) =>
      isCheckedInStatus(status)
        ? { ...merged, [CHECKED_IN_STATUS]: (merged[CHECKED_IN_STATUS] ?? 0) + count }
        : { ...merged, [status]: count },
    {},
  );
}

/** For status filters: any checked-in spelling matches every stored spelling. Returns a new, deduplicated array. */
export function withLegacyCheckedIn(statuses: readonly string[]): string[] {
  const expanded = statuses.flatMap((status) => (isCheckedInStatus(status) ? [...CHECKED_IN_STATUSES] : [status]));
  return [...new Set(expanded)];
}

/** True when both are the same status, treating the legacy "CheckedIn" and "Checked-in" as equal. */
export function isSameStatus(a: unknown, b: unknown): boolean {
  return a === b || (isCheckedInStatus(a) && isCheckedInStatus(b));
}

/** Decisions that must go through PATCH /api/status/[id] (emails, travel decision, allowed transitions). */
export const DECISION_STATUSES: readonly string[] = ["Admitted", "Waitlisted", "Refused"];
