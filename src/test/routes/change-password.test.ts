import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";

const adminModel = vi.hoisted(() => ({ findById: vi.fn(), updateOne: vi.fn() }));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: adminModel }));

import * as changePassword from "@/app/api/(group)/admin/change-password/[adminId]/route";
import { runGuardCases } from "@/test/guard-cases";
import { OTHER_ADMIN_ID, TEST_ADMIN_ID, adminCookie, buildRequest, routeContext } from "@/test/http";

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

async function patch(adminId: string, body: unknown, isSuperAdmin = false) {
  return changePassword.PATCH(
    buildRequest(`/api/admin/change-password/${adminId}`, { method: "PATCH", cookie: await adminCookie({ isSuperAdmin }), body }),
    routeContext({ adminId }),
  );
}

describe("PATCH /api/admin/change-password/[adminId]", () => {
  it("forbids a reviewer from changing someone else's password", async () => {
    const res = await patch(OTHER_ADMIN_ID, { newPassword: "brand new pass" });
    expect(res.status).toBe(403);
    expect(adminModel.updateOne).not.toHaveBeenCalled();
  });

  it("stores a bcrypt hash of the new password", async () => {
    adminModel.findById.mockResolvedValue({ _id: TEST_ADMIN_ID, password: await bcrypt.hash("old password", 4) });
    adminModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const res = await patch(TEST_ADMIN_ID, { newPassword: "brand new pass" });

    expect(res.status).toBe(200);
    expect((await res.json()).data).toBeNull();
    const [, update] = adminModel.updateOne.mock.calls[0] as [unknown, { $set: { password: string } }];
    await expect(bcrypt.compare("brand new pass", update.$set.password)).resolves.toBe(true);
  });

  it("rejects reusing the current password", async () => {
    adminModel.findById.mockResolvedValue({ _id: TEST_ADMIN_ID, password: await bcrypt.hash("same password", 4) });
    const res = await patch(TEST_ADMIN_ID, { newPassword: "same password" });
    expect(res.status).toBe(400);
  });

  it("lets a super admin reset another admin's password", async () => {
    adminModel.findById.mockResolvedValue({ _id: OTHER_ADMIN_ID, password: await bcrypt.hash("old password", 4) });
    adminModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
    const res = await patch(OTHER_ADMIN_ID, { newPassword: "reset by super" }, true);
    expect(res.status).toBe(200);
  });
});
