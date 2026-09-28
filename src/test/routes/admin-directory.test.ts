import { describe, expect, it, vi } from "vitest";

import { defaultSuperAdminLookup } from "@/test/admin-lookup";

// `findById`'s default implementation is a nested closure so the reference to
// `defaultSuperAdminLookup` only resolves at call time, after this file's imports have loaded.
// It's used two ways here: requireAdmin's super-admin re-check calls it as
// `findById(id).select(...).lean()`, while the get-adminInfo route below overrides it per-test
// with `.mockReturnValue({ select })` for its own `findById(id).select(...)` (no `.lean()`) shape.
const adminModel = vi.hoisted(() => ({
  find: vi.fn(),
  findById: vi.fn((id: string) => ({ select: () => ({ lean: async () => defaultSuperAdminLookup(id) }) })),
  findOne: vi.fn(),
  countDocuments: vi.fn(),
  updateOne: vi.fn(),
}));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: adminModel }));
vi.mock("@/repository/models/application", () => ({ default: {} }));
vi.mock("@/repository/models/team", () => ({ default: {} }));

import * as adminList from "@/app/api/(group)/admin/route";
import * as assign from "@/app/api/(group)/admin/assign-applications/route";
import * as autoAssign from "@/app/api/(group)/admin/auto-assign-applications/route";
import * as getEmails from "@/app/api/(group)/admin/get-emails/route";
import * as me from "@/app/api/(group)/auth-token/me/route";
import * as adminInfo from "@/app/api/(group)/get-adminInfo/[adminId]/route";
import { runGuardCases } from "@/test/guard-cases";
import { NON_SUPER_ADMIN_ID, OTHER_ADMIN_ID, TEST_ADMIN_ID, adminCookie, buildRequest, routeContext } from "@/test/http";

runGuardCases([
  { name: "GET /api/admin", handler: adminList.GET, method: "GET", url: "/api/admin", level: "super" },
  { name: "GET /api/admin/get-emails", handler: getEmails.GET, method: "GET", url: "/api/admin/get-emails", level: "any" },
  { name: "POST /api/admin/assign-applications", handler: assign.POST, method: "POST", url: "/api/admin/assign-applications", level: "super" },
  { name: "GET /api/admin/auto-assign-applications", handler: autoAssign.GET, method: "GET", url: "/api/admin/auto-assign-applications", level: "super" },
  { name: "POST /api/admin/auto-assign-applications", handler: autoAssign.POST, method: "POST", url: "/api/admin/auto-assign-applications", level: "super" },
  { name: "GET /api/auth-token/me", handler: me.GET, method: "GET", url: "/api/auth-token/me", level: "any" },
  {
    name: "GET /api/get-adminInfo/[adminId]",
    handler: adminInfo.GET,
    method: "GET",
    url: `/api/get-adminInfo/${TEST_ADMIN_ID}`,
    level: "any",
    params: { adminId: TEST_ADMIN_ID },
  },
]);

describe("GET /api/admin", () => {
  it("never selects the password field", async () => {
    const lean = vi.fn().mockResolvedValue([{ _id: OTHER_ADMIN_ID, firstName: "A", lastName: "B", email: "a@test.dev" }]);
    const limit = vi.fn(() => ({ lean }));
    const skip = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ skip }));
    adminModel.countDocuments.mockResolvedValue(1);
    adminModel.find.mockReturnValue({ select });

    const res = await adminList.GET(buildRequest("/api/admin", { cookie: await adminCookie({ isSuperAdmin: true }) }));

    expect(res.status).toBe(200);
    expect(select).toHaveBeenCalledWith("firstName lastName email");
    expect(JSON.stringify(await res.json())).not.toContain("password");
  });
});

describe("GET /api/get-adminInfo/[adminId]", () => {
  it("forbids a reviewer from reading another admin", async () => {
    // NON_SUPER_ADMIN_ID resolves as not-super in both the JWT and the DB (defaultSuperAdminLookup).
    const cookie = await adminCookie({ adminId: NON_SUPER_ADMIN_ID });
    const res = await adminInfo.GET(
      buildRequest(`/api/get-adminInfo/${OTHER_ADMIN_ID}`, { cookie }),
      routeContext({ adminId: OTHER_ADMIN_ID }),
    );
    expect(res.status).toBe(403);
  });

  it("takes super-admin status from the database, not a stale JWT claim, when viewing another admin", async () => {
    // The JWT claims super, but NON_SUPER_ADMIN_ID resolves as not-super in the DB
    // (src/test/admin-lookup.ts) — the DB must win, so this stays forbidden.
    const cookie = await adminCookie({ adminId: NON_SUPER_ADMIN_ID, isSuperAdmin: true });
    const res = await adminInfo.GET(
      buildRequest(`/api/get-adminInfo/${OTHER_ADMIN_ID}`, { cookie }),
      routeContext({ adminId: OTHER_ADMIN_ID }),
    );
    expect(res.status).toBe(403);
  });

  it("returns the caller's own record without the password", async () => {
    const select = vi.fn().mockResolvedValue({ _id: TEST_ADMIN_ID, email: "reviewer@test.dev" });
    adminModel.findById.mockReturnValueOnce({ select });

    const res = await adminInfo.GET(
      buildRequest(`/api/get-adminInfo/${TEST_ADMIN_ID}`, { cookie: await adminCookie() }),
      routeContext({ adminId: TEST_ADMIN_ID }),
    );

    expect(res.status).toBe(200);
    expect(select).toHaveBeenCalledWith("-password");
  });

  it("allows a DB-confirmed super admin to view another admin's record", async () => {
    const select = vi.fn().mockResolvedValue({ _id: OTHER_ADMIN_ID, email: "other@test.dev" });
    // The first findById call is the fetchIsSuperAdmin re-check for the caller (TEST_ADMIN_ID
    // resolves as super via defaultSuperAdminLookup); queue that answer explicitly, then queue
    // this override for the second call, the actual record fetch.
    adminModel.findById
      .mockImplementationOnce((id: string) => ({ select: () => ({ lean: async () => defaultSuperAdminLookup(id) }) }))
      .mockReturnValueOnce({ select });

    const res = await adminInfo.GET(
      buildRequest(`/api/get-adminInfo/${OTHER_ADMIN_ID}`, { cookie: await adminCookie() }),
      routeContext({ adminId: OTHER_ADMIN_ID }),
    );

    expect(res.status).toBe(200);
    expect(select).toHaveBeenCalledWith("-password");
  });
});
