import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFindByIdMock } from "@/test/admin-lookup";

const applicationModel = vi.hoisted(() => ({ find: vi.fn() }));
const adminModel = vi.hoisted(() => ({ find: vi.fn(), findById: vi.fn() }));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: adminModel }));
vi.mock("@/repository/models/application", () => ({ default: applicationModel }));

import * as advanced from "@/app/api/(group)/stats/advanced/route";
import { NON_SUPER_ADMIN_ID, adminCookie, buildRequest } from "@/test/http";

const APPLICATIONS = [
  {
    _id: "1", status: "Confirmed", age: "under-18", country: "US", city: "", travelReimbursement: true, gender: "female",
    isTravelReimbursementApproved: true, travelReimbursementAmount: 100, travelReimbursementCurrency: "USD",
  },
  {
    _id: "2", status: "Checked-in", age: "22", country: "US", city: "", travelReimbursement: true, gender: "male",
    isTravelReimbursementApproved: true, travelReimbursementAmount: 150, travelReimbursementCurrency: "CAD",
  },
];

beforeEach(() => {
  adminModel.findById.mockImplementation(createFindByIdMock());
  applicationModel.find.mockReturnValue({ lean: async () => APPLICATIONS });
  adminModel.find.mockReturnValue({ lean: async () => [] });
});

async function get(cookie: string) {
  const res = await advanced.GET(buildRequest("/api/stats/advanced", { cookie }));
  const text = await res.text();
  return { res, text, data: JSON.parse(text).data };
}

describe("GET /api/stats/advanced redaction", () => {
  it("sends a DB-verified regular reviewer no sensitive aggregate and no approved travel totals", async () => {
    const { res, text, data } = await get(await adminCookie({ adminId: NON_SUPER_ADMIN_ID }));

    expect(res.status).toBe(200);
    expect(data.sensitiveVisible).toBe(false);
    expect(data.overallTravelReimbursement).toBeNull();
    expect(data.confirmedTravelReimbursement).toBeNull();
    expect(data.genderDistribution).toEqual([]);
    expect(data.ageDistribution.buckets).toEqual([]);
    for (const leaked of ["289", "Female", "Male", "Under 18"]) expect(text).not.toContain(leaked);
    // The applicants' own answers stay visible.
    expect(data.travelReimbursement.requested).toBe(2);
  });

  it("does not trust an isSuperAdmin claim in the token", async () => {
    const { data } = await get(await adminCookie({ adminId: NON_SUPER_ADMIN_ID, isSuperAdmin: true }));
    expect(data.sensitiveVisible).toBe(false);
    expect(data.overallTravelReimbursement).toBeNull();
  });

  it("shows a super admin the gender, age and travel totals", async () => {
    const { text, data } = await get(await adminCookie());

    expect(data.sensitiveVisible).toBe(true);
    expect(data.overallTravelReimbursement).toBe(289);
    expect(data.confirmedTravelReimbursement).toBe(289);
    expect(text).toContain("Female");
    expect(data.ageDistribution.underEighteen).toBe(1);
  });
});
