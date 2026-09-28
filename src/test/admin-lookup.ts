import { vi } from "vitest";

import { NON_SUPER_ADMIN_ID, TEST_ADMIN_ID } from "./http";

export type SuperAdminLookup = { isSuperAdmin: boolean } | null;

/**
 * Default answer for the `Admin.findById(id).select("isSuperAdmin").lean()` query that
 * `requireAdmin`'s super-admin re-check performs (src/lib/require-admin.ts). TEST_ADMIN_ID — the
 * default `adminCookie()` subject — resolves as a super admin, so existing route tests that sign
 * a super-admin token for that id keep passing without each one wiring up its own DB mock.
 * NON_SUPER_ADMIN_ID resolves as a non-super admin, for guard tests exercising a demoted caller.
 * Any other id resolves to `null` ("not found"), simulating a deleted admin.
 */
export function defaultSuperAdminLookup(adminId: string): SuperAdminLookup {
  if (adminId === TEST_ADMIN_ID) return { isSuperAdmin: true };
  if (adminId === NON_SUPER_ADMIN_ID) return { isSuperAdmin: false };
  return null;
}

/**
 * Builds a mock for the Admin model's `findById(id).select(...).lean()` chain, backed by
 * `lookup` (defaults to `defaultSuperAdminLookup`). Spread the result into a route test's mocked
 * Admin model object so `requireAdmin`'s super-admin re-check has something to call; override a
 * specific id's answer with `mockFindById(id).mockResolvedValueOnce(...)`-style calls on the
 * returned `lean` mock if a test needs a different DB answer than the default table.
 */
export function createFindByIdMock(lookup: (id: string) => SuperAdminLookup | Promise<SuperAdminLookup> = defaultSuperAdminLookup) {
  return vi.fn((id: string) => ({
    select: () => ({
      lean: async () => lookup(id),
    }),
  }));
}
