import { describe, expect, it, vi } from "vitest";

import { defaultSuperAdminLookup } from "@/test/admin-lookup";

/**
 * `Admin.findById(id)` is called two different ways by this route (and by fetchIsSuperAdmin,
 * which it uses internally): `.select("isSuperAdmin").lean()` for the DB super-admin re-check,
 * and `.select("assignedApplications").lean().exec()` to load a non-super caller's assignment
 * list. Dispatch on the `select` field name so one mock answers both call shapes.
 */
const assignedApplicationsByAdminId = vi.hoisted(() => new Map<string, string[]>());

const adminModel = vi.hoisted(() => ({
  findById: vi.fn((id: string) => ({
    select: (fields: string) => {
      if (fields === "isSuperAdmin") {
        return { lean: async () => defaultSuperAdminLookup(id) };
      }
      const result = Promise.resolve({ assignedApplications: assignedApplicationsByAdminId.get(id) ?? [] });
      (result as unknown as { exec: () => typeof result }).exec = () => result;
      return { lean: () => result };
    },
  })),
}));

const applicationModel = vi.hoisted(() => ({ countDocuments: vi.fn(), find: vi.fn() }));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: adminModel }));
vi.mock("@/repository/models/application", () => ({ default: applicationModel }));

import * as paginated from "@/app/api/(group)/users/paginated/route";
import { runGuardCases } from "@/test/guard-cases";
import { NON_SUPER_ADMIN_ID, adminCookie, buildRequest } from "@/test/http";

runGuardCases([{ name: "GET /api/users/paginated", handler: paginated.GET, method: "GET", url: "/api/users/paginated", level: "any" }]);

function mockApplicationsQuery(docs: unknown[], total: number) {
  const exec = vi.fn().mockResolvedValue(docs);
  const lean = vi.fn(() => ({ exec }));
  const limit = vi.fn(() => ({ lean }));
  const skip = vi.fn(() => ({ limit }));
  const sort = vi.fn(() => ({ skip }));
  applicationModel.find.mockReturnValue({ sort });
  applicationModel.countDocuments.mockResolvedValue(total);
}

describe("GET /api/users/paginated", () => {
  it("applies the assigned-applications filter when the DB says the caller is not super, even if the JWT claims super", async () => {
    const assignedId = "64c000000000000000000009";
    assignedApplicationsByAdminId.set(NON_SUPER_ADMIN_ID, [assignedId]);
    mockApplicationsQuery([], 0);

    const cookie = await adminCookie({ adminId: NON_SUPER_ADMIN_ID, isSuperAdmin: true });
    const res = await paginated.GET(buildRequest("/api/users/paginated", { cookie }));

    expect(res.status).toBe(200);
    const [query] = applicationModel.find.mock.calls[0] as [Record<string, unknown>];
    expect(query._id).toEqual({ $in: [assignedId] });
    const body = await res.json();
    expect(body.isSuperAdmin).toBe(false);
  });

  it("does not apply the assigned-applications filter when the DB confirms the caller is super", async () => {
    mockApplicationsQuery([], 0);

    const res = await paginated.GET(buildRequest("/api/users/paginated", { cookie: await adminCookie() }));

    expect(res.status).toBe(200);
    const [query] = applicationModel.find.mock.calls[0] as [Record<string, unknown>];
    expect(query._id).toBeUndefined();
    const body = await res.json();
    expect(body.isSuperAdmin).toBe(true);
  });

  it("returns 401 when the caller's admin record no longer exists in the DB", async () => {
    const deletedAdminId = "64b000000000000000000098";
    const res = await paginated.GET(buildRequest("/api/users/paginated", { cookie: await adminCookie({ adminId: deletedAdminId }) }));
    expect(res.status).toBe(401);
    expect(applicationModel.find).not.toHaveBeenCalled();
  });
});

describe("GET /api/users/paginated input hardening", () => {
  async function run(qs: string) {
    const exec = vi.fn().mockResolvedValue([]);
    const lean = vi.fn(() => ({ exec }));
    const limit = vi.fn(() => ({ lean }));
    const skip = vi.fn(() => ({ limit }));
    const sort = vi.fn(() => ({ skip }));
    applicationModel.find.mockReturnValue({ sort });
    applicationModel.countDocuments.mockResolvedValue(0);
    const res = await paginated.GET(buildRequest(`/api/users/paginated?${qs}`, { cookie: await adminCookie({ adminId: NON_SUPER_ADMIN_ID }) }));
    return { res, sort, limit };
  }

  it("falls back to createdAt when the sort field is not allowlisted (no sorting by hidden fields)", async () => {
    assignedApplicationsByAdminId.set(NON_SUPER_ADMIN_ID, ["64c000000000000000000009"]);
    for (const field of ["isTravelReimbursementApproved", "phoneNumber", "gender", "age", "$where"]) {
      const { res, sort } = await run(`sortField=${encodeURIComponent(field)}&sortOrder=asc`);
      expect(res.status).toBe(200);
      expect(sort).toHaveBeenCalledWith({ createdAt: 1 });
    }
  });

  it("keeps an allowlisted sort field", async () => {
    assignedApplicationsByAdminId.set(NON_SUPER_ADMIN_ID, ["64c000000000000000000009"]);
    const { sort } = await run("sortField=lastName&sortOrder=desc");
    expect(sort).toHaveBeenCalledWith({ lastName: -1 });
  });

  it("escapes regex characters in the search", async () => {
    assignedApplicationsByAdminId.set(NON_SUPER_ADMIN_ID, ["64c000000000000000000009"]);
    await run("search=" + encodeURIComponent("a.*(b"));
    const [query] = applicationModel.find.mock.calls[0] as [{ $or: { email: { $regex: string } }[] }];
    expect(query.$or[0].email.$regex).toBe(String.raw`a\.\*\(b`);
  });

  it("caps the page size at 100 and survives non-numeric paging", async () => {
    assignedApplicationsByAdminId.set(NON_SUPER_ADMIN_ID, ["64c000000000000000000009"]);
    const big = await run("limit=100000");
    expect(big.limit).toHaveBeenCalledWith(100);
    const junk = await run("limit=abc&page=-4");
    expect(junk.limit).toHaveBeenCalledWith(10);
  });
});
