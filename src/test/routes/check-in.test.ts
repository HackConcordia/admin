import { describe, expect, it, vi } from "vitest";

const applicationModel = vi.hoisted(() => ({ findById: vi.fn(), findByIdAndUpdate: vi.fn() }));
const mealModel = vi.hoisted(() => ({ findOne: vi.fn() }));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/application", () => ({ default: applicationModel }));
vi.mock("@/repository/models/meal", () => ({ default: mealModel }));
vi.mock("@/repository/models/qrcodemapping", () => ({ default: {} }));

import * as checkIn from "@/app/api/(group)/check-in/[userId]/route";
import { runGuardCases } from "@/test/guard-cases";
import { adminCookie, buildRequest, routeContext } from "@/test/http";

const USER_ID = "64c000000000000000000001";

runGuardCases([
  { name: "PATCH /api/check-in/[userId]", handler: checkIn.PATCH, method: "PATCH", url: `/api/check-in/${USER_ID}`, level: "any", params: { userId: USER_ID } },
]);

async function patch() {
  return checkIn.PATCH(
    buildRequest(`/api/check-in/${USER_ID}`, { method: "PATCH", cookie: await adminCookie(), body: { status: "Checked-in" } }),
    routeContext({ userId: USER_ID }),
  );
}

describe("PATCH /api/check-in/[userId]", () => {
  it("returns 409 for an applicant stored with the legacy CheckedIn value", async () => {
    applicationModel.findById.mockResolvedValue({ status: "CheckedIn" });
    const res = await patch();
    expect(res.status).toBe(409);
    expect((await res.json()).message).toBe("User is already checked-in");
  });

  it("returns 409 when the applicant is not Confirmed", async () => {
    applicationModel.findById.mockResolvedValue({ status: "Admitted" });
    expect((await patch()).status).toBe(409);
  });

  it("writes the canonical Checked-in value", async () => {
    applicationModel.findById.mockResolvedValue({ status: "Confirmed", firstName: "A", lastName: "B", email: "a@b.c" });
    applicationModel.findByIdAndUpdate.mockResolvedValue({});
    mealModel.findOne.mockResolvedValue({ _id: USER_ID });

    const res = await patch();

    expect(res.status).toBe(200);
    expect(applicationModel.findByIdAndUpdate).toHaveBeenCalledWith(USER_ID, { $set: { status: "Checked-in" } });
    expect((await res.json()).data).toEqual({ status: "Checked-in" });
  });
});
