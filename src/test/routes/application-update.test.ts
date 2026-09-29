import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFindByIdMock } from "@/test/admin-lookup";

const applicationModel = vi.hoisted(() => ({
  findById: vi.fn(),
  findByIdAndUpdate: vi.fn(),
  findOneAndUpdate: vi.fn(),
  findByIdAndDelete: vi.fn(),
}));
const checkInModel = vi.hoisted(() => ({ updateOne: vi.fn(async () => ({})), findOneAndDelete: vi.fn(async () => null) }));
const emails = vi.hoisted(() => ({ sendDiscordLink: vi.fn(async () => true) }));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: { findById: createFindByIdMock() } }));
vi.mock("@/repository/models/application", () => ({ default: applicationModel }));
vi.mock("@/repository/models/checkin", () => ({ default: checkInModel }));
vi.mock("@/utils/admissionEmailConfig", () => emails);

import * as route from "@/app/api/(group)/application/[applicationId]/route";
import { TEST_ADMIN_EMAIL, adminCookie, buildRequest, routeContext } from "@/test/http";

const APP_ID = "64c000000000000000000001";
const NAMES = { firstName: "Ada", lastName: "Lovelace" };
const STORED = {
  _id: APP_ID,
  email: "ada@test.dev",
  firstName: "Ada",
  lastName: "Lovelace",
  status: "Submitted",
  currentLevelOfSchooling: "Undergraduate",
};

async function put(body: unknown, id = APP_ID) {
  return route.PUT(
    buildRequest(`/api/application/${id}`, { method: "PUT", cookie: await adminCookie(), body }),
    routeContext({ applicationId: id }),
  );
}

beforeEach(() => {
  applicationModel.findById.mockResolvedValue(STORED);
  applicationModel.findByIdAndUpdate.mockImplementation(async (_id: string, update: { $set: object }) => ({
    toObject: () => ({ ...STORED, ...update.$set }),
  }));
  applicationModel.findOneAndUpdate.mockImplementation(async (_filter: object, update: { $set: object }) => ({
    toObject: () => ({ ...STORED, ...update.$set }),
  }));
});

describe("PUT /api/application/[applicationId]", () => {
  it("saves an XI application without isEighteenOrAbove (the ConUHacks X hard break)", async () => {
    const res = await put({ ...NAMES, email: "evil@x.dev", age: "19", discipline: "data-science", travelReimbursement: null });

    expect(res.status).toBe(200);
    const [, update, options] = applicationModel.findByIdAndUpdate.mock.calls[0];
    expect(update.$set).toMatchObject({ age: "19", discipline: "data-science", travelReimbursement: null });
    expect(update.$set).not.toHaveProperty("email");
    expect(options).toEqual({ new: true, runValidators: true });
  });

  it("rejects an invalid value before touching the database", async () => {
    const res = await put({ ...NAMES, github: "javascript:alert(1)" });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ message: "github must be an http(s) link", error: null });
    expect(applicationModel.findById).not.toHaveBeenCalled();
  });

  it("validates the current year against the stored level when the body omits it", async () => {
    const res = await put({ ...NAMES, currentYear: "Year 9" });

    expect(res.status).toBe(400);
    expect(applicationModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("makes a status change conditional on the stored status and records the session admin", async () => {
    const res = await put({ ...NAMES, status: "Admitted", processedBy: "attacker@evil.dev" });

    expect(res.status).toBe(200);
    expect(applicationModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: APP_ID, status: "Submitted" },
      { $set: expect.objectContaining({ status: "Admitted", processedBy: TEST_ADMIN_EMAIL }) },
      { new: true, runValidators: true },
    );
  });

  it("creates the check-in record and sends the Discord email when moving to Confirmed", async () => {
    applicationModel.findById.mockResolvedValue({ ...STORED, status: "Admitted" });

    const res = await put({ ...NAMES, status: "Confirmed" });

    expect(res.status).toBe(200);
    expect(checkInModel.updateOne).toHaveBeenCalledWith(
      { email: "ada@test.dev" },
      { $setOnInsert: { email: "ada@test.dev", isCheckedIn: false } },
      { upsert: true },
    );
    expect(emails.sendDiscordLink).toHaveBeenCalledWith("ada@test.dev", "Ada", "Lovelace");
  });

  it("answers 404 for a missing application and 400 for a malformed id", async () => {
    applicationModel.findById.mockResolvedValue(null);
    expect((await put(NAMES)).status).toBe(404);
    expect((await put(NAMES, "not-an-id")).status).toBe(400);
  });
});
