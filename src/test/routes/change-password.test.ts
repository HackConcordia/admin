import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";

import { defaultSuperAdminLookup } from "@/test/admin-lookup";

const adminModel = vi.hoisted(() => ({ findById: vi.fn(), updateOne: vi.fn() }));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: adminModel }));

import * as changePassword from "@/app/api/(group)/admin/change-password/[adminId]/route";
import { runGuardCases } from "@/test/guard-cases";
import { NON_SUPER_ADMIN_ID, OTHER_ADMIN_ID, TEST_ADMIN_ID, adminCookie, buildRequest, routeContext } from "@/test/http";

runGuardCases([
  {
    name: "PATCH /api/admin/change-password/[adminId]",
    handler: changePassword.PATCH,
    method: "PATCH",
    url: `/api/admin/change-password/${TEST_ADMIN_ID}`,
    level: "any",
    params: { adminId: TEST_ADMIN_ID },
  },
]);

type SuperAnswer = { isSuperAdmin: boolean } | null;
type Record_ = { _id: string; password: string };

/**
 * `Admin.findById` is called two different ways in this route:
 *  - `fetchIsSuperAdmin(callerId)` re-checks the caller against the DB via
 *    `findById(callerId).select("isSuperAdmin").lean()` (a chain).
 *  - the route's own lookup of the target admin's full record (for password verification/
 *    update) via a direct `await findById(targetId)`.
 * Every test here only ever uses a given id in one of those two roles, so this dispatches by id:
 * an id present in `records` resolves directly to that record; any other id falls back to the
 * chain shape, answered by `superAnswers` (or `defaultSuperAdminLookup` if not listed there).
 */
function mockAdminLookups(options: { records?: Record<string, Record_ | null>; superAnswers?: Record<string, SuperAnswer> } = {}) {
  const records = options.records ?? {};
  const superAnswers = options.superAnswers ?? {};

  adminModel.findById.mockImplementation((id: string) => {
    if (id in records) return Promise.resolve(records[id]);
    return { select: () => ({ lean: async () => (id in superAnswers ? superAnswers[id] : defaultSuperAdminLookup(id)) }) };
  });
}

async function patch(adminId: string, body: unknown, caller: { isSuperAdmin?: boolean; adminId?: string } = {}) {
  return changePassword.PATCH(
    buildRequest(`/api/admin/change-password/${adminId}`, { method: "PATCH", cookie: await adminCookie(caller), body }),
    routeContext({ adminId }),
  );
}

describe("PATCH /api/admin/change-password/[adminId]", () => {
  it("rejects a malformed admin id with 400", async () => {
    const res = await patch("not-an-id", { currentPassword: "old", newPassword: "new" });
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("Invalid admin id");
    expect(adminModel.findById).not.toHaveBeenCalled();
  });

  it("requires currentPassword for self password change", async () => {
    const res = await patch(TEST_ADMIN_ID, { newPassword: "brand new pass" });
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("Current password is required");
    // Self-change never needs the DB super-admin re-check.
    expect(adminModel.findById).not.toHaveBeenCalled();
  });

  it("rejects wrong currentPassword with 403 and no update", async () => {
    mockAdminLookups({ records: { [TEST_ADMIN_ID]: { _id: TEST_ADMIN_ID, password: await bcrypt.hash("correct password", 4) } } });
    const res = await patch(TEST_ADMIN_ID, { currentPassword: "wrong password", newPassword: "brand new pass" });
    expect(res.status).toBe(403);
    expect((await res.json()).message).toContain("Current password is incorrect");
    expect(adminModel.updateOne).not.toHaveBeenCalled();
  });

  it("stores a bcrypt hash of the new password when currentPassword is correct", async () => {
    mockAdminLookups({ records: { [TEST_ADMIN_ID]: { _id: TEST_ADMIN_ID, password: await bcrypt.hash("old password", 4) } } });
    adminModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const res = await patch(TEST_ADMIN_ID, { currentPassword: "old password", newPassword: "brand new pass" });

    expect(res.status).toBe(200);
    expect((await res.json()).data).toBeNull();
    const [, update] = adminModel.updateOne.mock.calls[0] as [unknown, { $set: { password: string } }];
    await expect(bcrypt.compare("brand new pass", update.$set.password)).resolves.toBe(true);
  });

  it("rejects reusing the current password", async () => {
    mockAdminLookups({ records: { [TEST_ADMIN_ID]: { _id: TEST_ADMIN_ID, password: await bcrypt.hash("same password", 4) } } });
    const res = await patch(TEST_ADMIN_ID, { currentPassword: "same password", newPassword: "same password" });
    expect(res.status).toBe(400);
  });

  it("forbids a reviewer from changing someone else's password even when the JWT claims super", async () => {
    // NON_SUPER_ADMIN_ID's JWT claims super, but it resolves as not-super in the DB
    // (defaultSuperAdminLookup) — the DB must win, so this stays forbidden.
    mockAdminLookups({ records: { [OTHER_ADMIN_ID]: { _id: OTHER_ADMIN_ID, password: await bcrypt.hash("old password", 4) } } });
    const res = await patch(OTHER_ADMIN_ID, { newPassword: "brand new pass" }, { adminId: NON_SUPER_ADMIN_ID, isSuperAdmin: true });
    expect(res.status).toBe(403);
    expect(adminModel.updateOne).not.toHaveBeenCalled();
  });

  it("returns 401 when the caller's admin record no longer exists in the DB", async () => {
    const deletedAdminId = "64b000000000000000000099";
    mockAdminLookups(); // deletedAdminId isn't in records or superAnswers -> defaultSuperAdminLookup -> null
    const res = await patch(OTHER_ADMIN_ID, { newPassword: "brand new pass" }, { adminId: deletedAdminId, isSuperAdmin: true });
    expect(res.status).toBe(401);
    expect(adminModel.updateOne).not.toHaveBeenCalled();
  });

  it("lets a super admin (DB-confirmed) reset another admin's password without currentPassword", async () => {
    mockAdminLookups({ records: { [OTHER_ADMIN_ID]: { _id: OTHER_ADMIN_ID, password: await bcrypt.hash("old password", 4) } } });
    adminModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
    const res = await patch(OTHER_ADMIN_ID, { newPassword: "reset by super" }, { isSuperAdmin: true });
    expect(res.status).toBe(200);
  });

  it("lets a super admin (DB-confirmed) reset another admin's password and rejects reuse", async () => {
    mockAdminLookups({ records: { [OTHER_ADMIN_ID]: { _id: OTHER_ADMIN_ID, password: await bcrypt.hash("existing password", 4) } } });
    const res = await patch(OTHER_ADMIN_ID, { newPassword: "existing password" }, { isSuperAdmin: true });
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("cannot be the same");
  });
});
