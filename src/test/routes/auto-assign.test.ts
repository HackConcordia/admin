import { beforeEach, describe, expect, it, vi } from "vitest";

import { defaultSuperAdminLookup } from "@/test/admin-lookup";

const adminModel = vi.hoisted(() => ({
  find: vi.fn(),
  findById: vi.fn((id: string) => ({ select: () => ({ lean: async () => defaultSuperAdminLookup(id) }) })),
  countDocuments: vi.fn(),
  updateOne: vi.fn(),
}));
const applicationModel = vi.hoisted(() => ({
  find: vi.fn(),
  countDocuments: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: adminModel }));
vi.mock("@/repository/models/application", () => ({ default: applicationModel }));

import * as autoAssign from "@/app/api/(group)/admin/auto-assign-applications/route";
import { adminCookie, buildRequest } from "@/test/http";

type Row = { _id: string; teamId?: string; travelReimbursement?: boolean | null };

function mockUnassigned(rows: Row[]) {
  const select = vi.fn(() => ({ lean: () => ({ exec: async () => rows }) }));
  applicationModel.find.mockReturnValue({ select });
  return select;
}

function mockReviewers(emails: string[]) {
  adminModel.find.mockReturnValue({
    select: () => ({ lean: () => ({ exec: async () => emails.map((email) => ({ email, assignedApplications: [] })) }) }),
  });
}

async function post() {
  return autoAssign.POST(
    buildRequest("/api/admin/auto-assign-applications", { method: "POST", cookie: await adminCookie({ isSuperAdmin: true }) }),
  );
}

function assignedIds(): string[] {
  return applicationModel.updateMany.mock.calls.flatMap((call) => (call[0] as { _id: { $in: string[] } })._id.$in);
}

beforeEach(() => {
  applicationModel.updateMany.mockResolvedValue({});
  adminModel.updateOne.mockResolvedValue({});
  mockReviewers(["r1@test.dev", "r2@test.dev"]);
});

describe("POST /api/admin/auto-assign-applications travel holds", () => {
  it("skips a whole team when one member asked for travel reimbursement", async () => {
    mockUnassigned([
      { _id: "a1", teamId: "t1", travelReimbursement: true },
      { _id: "a2", teamId: "t1", travelReimbursement: false },
      { _id: "a3", teamId: "t1", travelReimbursement: null },
      { _id: "b1", teamId: "t2", travelReimbursement: false },
    ]);

    const res = await post();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(assignedIds().sort()).toEqual(["b1"]);
    expect(body.data.totalAssigned).toBe(1);
    expect(body.data.heldForManualAssignment).toBe(3);
    expect(body.data.heldGroups).toBe(1);
    expect(body.message).toContain("3");
  });

  it("skips an individual travel-asker and still assigns the others", async () => {
    mockUnassigned([
      { _id: "s1", travelReimbursement: true },
      { _id: "s2", travelReimbursement: false },
      { _id: "s3" },
      { _id: "c1", teamId: "t9", travelReimbursement: false },
      { _id: "c2", teamId: "t9", travelReimbursement: false },
    ]);

    const res = await post();
    const body = await res.json();

    expect(assignedIds().sort()).toEqual(["c1", "c2", "s2", "s3"]);
    expect(body.data.totalAssigned).toBe(4);
    expect(body.data.teamsAssigned).toBe(1);
    expect(body.data.heldForManualAssignment).toBe(1);
    expect(body.data.heldGroups).toBe(1);
  });

  it("fetches travelReimbursement in the select", async () => {
    const select = mockUnassigned([{ _id: "s2", travelReimbursement: false }]);
    await post();
    expect(select).toHaveBeenCalledWith(expect.stringContaining("travelReimbursement"));
  });

  it("assigns nothing and reports the holds when every group is held", async () => {
    mockUnassigned([{ _id: "s1", travelReimbursement: true }]);

    const res = await post();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(applicationModel.updateMany).not.toHaveBeenCalled();
    expect(body.data.totalAssigned).toBe(0);
    expect(body.data.heldForManualAssignment).toBe(1);
  });

  it("reports zero holds when nobody asked for travel", async () => {
    mockUnassigned([{ _id: "s2", travelReimbursement: false }]);
    const body = await (await post()).json();
    expect(body.data.heldForManualAssignment).toBe(0);
    expect(body.data.totalAssigned).toBe(1);
  });
});

describe("GET /api/admin/auto-assign-applications preview", () => {
  it("reports how many applications would be held for manual assignment", async () => {
    mockUnassigned([
      { _id: "a1", teamId: "t1", travelReimbursement: true },
      { _id: "a2", teamId: "t1", travelReimbursement: false },
      { _id: "s2", travelReimbursement: false },
    ]);
    adminModel.countDocuments.mockResolvedValue(2);

    const res = await autoAssign.GET(
      buildRequest("/api/admin/auto-assign-applications", { cookie: await adminCookie({ isSuperAdmin: true }) }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.unassignedCount).toBe(3);
    expect(body.data.heldForManualAssignment).toBe(2);
    expect(body.data.reviewerCount).toBe(2);
  });
});
