type SensitiveStats = {
  tshirtCounts: Record<string, number>;
  dietaryRestrictionsData: readonly { restriction: string; count: number }[];
};

/**
 * Zeroes the headcounts of super-admin-only fields (shirtSize -> tshirtCounts, dietaryRestrictions ->
 * dietaryRestrictionsData) for a caller who is not a DB-verified super admin. Categories stay; counts do not.
 */
export function redactSensitiveStats<T extends SensitiveStats>(stats: T, isSuperAdmin: boolean): T {
  if (isSuperAdmin) return stats;
  return {
    ...stats,
    tshirtCounts: Object.fromEntries(Object.keys(stats.tshirtCounts).map((size) => [size, 0])),
    dietaryRestrictionsData: stats.dietaryRestrictionsData.map((entry) => ({ ...entry, count: 0 })),
  } as T;
}
