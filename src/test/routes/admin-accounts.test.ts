import { describe, expect, it, vi } from "vitest";

import { defaultSuperAdminLookup } from "@/test/admin-lookup";

// `findById`'s implementation is a nested closure so the reference to `defaultSuperAdminLookup`
// (imported from another module) is only resolved when a test actually calls it, after this
// file's imports have fully loaded — vi.hoisted's own factory runs before that.
const adminModel = vi.hoisted(() => ({
  findOne: vi.fn(),
  create: vi.fn(),
  findByIdAndDelete: vi.fn(),
  findById: vi.fn((id: string) => ({ select: () => ({ lean: async () => defaultSuperAdminLookup(id) }) })),
}));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: adminModel }));

import * as createAdmin from "@/app/api/(group)/admin/create-admin/route";
import * as deleteAdmin from "@/app/api/(group)/admin/delete-admin/[adminId]/route";
import { runGuardCases } from "@/test/guard-cases";
import { OTHER_ADMIN_ID, TEST_ADMIN_ID, adminCookie, buildRequest, routeContext } from "@/test/http";

runGuardCases([
  { name: "POST /api/admin/create-admin", handler: createAdmin.POST, method: "POST", url: "/api/admin/create-admin", level: "super" },
  {
    name: "DELETE /api/admin/delete-admin/[adminId]",
    handler: deleteAdmin.DELETE,
    method: "DELETE",
    url: `/api/admin/delete-admin/${OTHER_ADMIN_ID}`,
    level: "super",
    params: { adminId: OTHER_ADMIN_ID },
  },
]);

const NEW_ADMIN = { firstName: "Ada", lastName: "Lovelace", email: "ada@test.dev", password: "analytical1" };

describe("POST /api/admin/create-admin", () => {
  it("stores a bcrypt hash and never echoes the password", async () => {
    adminModel.findOne.mockResolvedValue(null);
    adminModel.create.mockImplementation(async (doc: Record<string, unknown>) => ({ _id: OTHER_ADMIN_ID, isSuperAdmin: false, ...doc }));

    const res = await createAdmin.POST(
      buildRequest("/api/admin/create-admin", { method: "POST", cookie: await adminCookie({ isSuperAdmin: true }), body: NEW_ADMIN }),
    );

    expect(res.status).toBe(200);
    const stored = adminModel.create.mock.calls[0][0] as { password: string };
    expect(stored.password.startsWith("$2")).toBe(true);
    expect(stored.password).not.toBe(NEW_ADMIN.password);
    const body = await res.json();
    expect(body.data).toEqual({ _id: OTHER_ADMIN_ID, firstName: "Ada", lastName: "Lovelace", email: "ada@test.dev", isSuperAdmin: false });
  });

  it("stores the email trimmed and lowercased", async () => {
    adminModel.findOne.mockResolvedValue(null);
    adminModel.create.mockImplementation(async (doc: Record<string, unknown>) => ({ _id: OTHER_ADMIN_ID, isSuperAdmin: false, ...doc }));

    const res = await createAdmin.POST(
      buildRequest("/api/admin/create-admin", {
        method: "POST",
        cookie: await adminCookie({ isSuperAdmin: true }),
        body: { ...NEW_ADMIN, email: "  Ada@Test.DEV " },
      }),
    );

    expect(res.status).toBe(200);
    expect((adminModel.create.mock.calls[0][0] as { email: string }).email).toBe("ada@test.dev");
    expect((await res.json()).data.email).toBe("ada@test.dev");
  });

  it("looks up duplicates with an anchored, escaped, case-insensitive match", async () => {
    adminModel.findOne.mockResolvedValue({ _id: "existing" });

    const res = await createAdmin.POST(
      buildRequest("/api/admin/create-admin", {
        method: "POST",
        cookie: await adminCookie({ isSuperAdmin: true }),
        body: { ...NEW_ADMIN, email: "Ada.L+x@Test.dev" },
      }),
    );

    expect(res.status).toBe(409);
    expect(adminModel.create).not.toHaveBeenCalled();
    expect(adminModel.findOne).toHaveBeenCalledWith({ email: { $regex: "^ada\\.l\\+x@test\\.dev$", $options: "i" } });
  });

  it("rejects a password shorter than 8 characters", async () => {
    const res = await createAdmin.POST(
      buildRequest("/api/admin/create-admin", {
        method: "POST",
        cookie: await adminCookie({ isSuperAdmin: true }),
        body: { ...NEW_ADMIN, password: "short" },
      }),
    );
    expect(res.status).toBe(400);
    expect(adminModel.create).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/delete-admin/[adminId]", () => {
  it("rejects a malformed admin id with 400", async () => {
    const res = await deleteAdmin.DELETE(
      buildRequest("/api/admin/delete-admin/not-an-id", { method: "DELETE", cookie: await adminCookie({ isSuperAdmin: true }) }),
      routeContext({ adminId: "not-an-id" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("Invalid admin id");
    expect(adminModel.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it("refuses to delete the caller's own account", async () => {
    const res = await deleteAdmin.DELETE(
      buildRequest(`/api/admin/delete-admin/${TEST_ADMIN_ID}`, { method: "DELETE", cookie: await adminCookie({ isSuperAdmin: true }) }),
      routeContext({ adminId: TEST_ADMIN_ID }),
    );
    expect(res.status).toBe(400);
    expect(adminModel.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it("returns only id and email of the deleted admin", async () => {
    adminModel.findByIdAndDelete.mockResolvedValue({ _id: OTHER_ADMIN_ID, email: "old@test.dev", password: "$2b$12$x" });
    const res = await deleteAdmin.DELETE(
      buildRequest(`/api/admin/delete-admin/${OTHER_ADMIN_ID}`, { method: "DELETE", cookie: await adminCookie({ isSuperAdmin: true }) }),
      routeContext({ adminId: OTHER_ADMIN_ID }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ _id: OTHER_ADMIN_ID, email: "old@test.dev" });
  });
});
