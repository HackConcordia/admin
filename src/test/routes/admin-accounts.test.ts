import { describe, expect, it, vi } from "vitest";

const adminModel = vi.hoisted(() => ({ findOne: vi.fn(), create: vi.fn(), findByIdAndDelete: vi.fn() }));

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
