import { beforeEach, describe, expect, it, vi } from "vitest";

const applicationModel = vi.hoisted(() => ({ findById: vi.fn(), findOneAndUpdate: vi.fn() }));
const mealModel = vi.hoisted(() => ({ exists: vi.fn(), create: vi.fn() }));
const mappingModel = vi.hoisted(() => ({ findOne: vi.fn(), create: vi.fn(), deleteOne: vi.fn(), updateOne: vi.fn() }));
const eventConfig = vi.hoisted(() => ({ getCheckInEventConfig: vi.fn() }));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/application", () => ({ default: applicationModel }));
vi.mock("@/repository/models/meal", () => ({ default: mealModel }));
vi.mock("@/repository/models/qrcodemapping", () => ({ default: mappingModel }));
vi.mock("@/config/event", () => eventConfig);

import * as checkIn from "@/app/api/(group)/check-in/[userId]/route";
import { runGuardCases } from "@/test/guard-cases";
import { TEST_ADMIN_EMAIL, adminCookie, buildRequest, routeContext } from "@/test/http";

const USER_ID = "64c000000000000000000001";
const EVENT_ID_FIXTURE = "6700000000000000000dec26";
const CONFIG = {
  eventId: EVENT_ID_FIXTURE,
  meals: [
    { date: "2026-11-28", type: "breakfast" },
    { date: "2026-11-28", type: "lunch" },
  ],
};
const CONFIRMED = { status: "Confirmed", firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" };
const MAPPING_ID = "6800000000000000000000aa";

function duplicateKeyError(): Error {
  return Object.assign(new Error("E11000 duplicate key error collection: qrcodemappings index: qrCodeNumber_1"), { code: 11000 });
}

runGuardCases([
  { name: "PATCH /api/check-in/[userId]", handler: checkIn.PATCH, method: "PATCH", url: `/api/check-in/${USER_ID}`, level: "any", params: { userId: USER_ID } },
]);

async function patch(body: unknown, userId = USER_ID) {
  return checkIn.PATCH(
    buildRequest(`/api/check-in/${userId}`, { method: "PATCH", cookie: await adminCookie(), body }),
    routeContext({ userId }),
  );
}

describe("PATCH /api/check-in/[userId]", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    eventConfig.getCheckInEventConfig.mockReset();
    for (const model of [applicationModel, mealModel, mappingModel]) {
      for (const fn of Object.values(model)) fn.mockReset();
    }
  });

  function happyPath() {
    eventConfig.getCheckInEventConfig.mockReturnValue(CONFIG);
    applicationModel.findById.mockResolvedValue(CONFIRMED);
    applicationModel.findOneAndUpdate.mockResolvedValue({ ...CONFIRMED, status: "Checked-in" });
    mappingModel.findOne.mockResolvedValue(null);
    mappingModel.create.mockResolvedValue({ _id: MAPPING_ID });
    mappingModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
    mealModel.exists.mockResolvedValue(null);
    mealModel.create.mockResolvedValue({});
  }

  it("returns 409 for an applicant stored with the legacy CheckedIn value", async () => {
    eventConfig.getCheckInEventConfig.mockReturnValue(CONFIG);
    applicationModel.findById.mockResolvedValue({ status: "CheckedIn" });

    const res = await patch({ status: "Checked-in", qrCodeNumber: 7 });

    expect(res.status).toBe(409);
    expect((await res.json()).message).toBe("User is already checked-in");
  });

  it("returns 409 when the applicant is not Confirmed", async () => {
    eventConfig.getCheckInEventConfig.mockReturnValue(CONFIG);
    applicationModel.findById.mockResolvedValue({ status: "Admitted" });

    expect((await patch({ status: "Checked-in", qrCodeNumber: 7 })).status).toBe(409);
  });

  it("records the badge under EVENT_ID, writes Checked-in and seeds meals from EVENT_MEALS", async () => {
    happyPath();

    const res = await patch({ status: "Checked-in", qrCodeNumber: 7, eventId: "6964c0a037ee55cd2e05d1c3" });

    expect(res.status).toBe(200);
    expect(mappingModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ qrCodeNumber: 7, applicationId: USER_ID, eventId: EVENT_ID_FIXTURE, checkedInBy: TEST_ADMIN_EMAIL }),
    );
    expect(applicationModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: USER_ID, status: "Confirmed" },
      { $set: { status: "Checked-in", checkedInAt: expect.any(Date) } },
      { new: true },
    );
    expect(mappingModel.findOne).toHaveBeenCalledWith({ qrCodeNumber: 7, eventId: EVENT_ID_FIXTURE });
    expect(mealModel.exists).toHaveBeenCalledWith({ email: "ada@example.com" });
    expect(mappingModel.deleteOne).not.toHaveBeenCalled();
    expect(mealModel.create).toHaveBeenCalledWith({
      _id: USER_ID,
      name: "Ada Lovelace",
      email: "ada@example.com",
      meals: [
        { date: new Date("2026-11-28T00:00:00.000Z"), type: "breakfast", taken: false },
        { date: new Date("2026-11-28T00:00:00.000Z"), type: "lunch", taken: false },
      ],
    });
  });

  it("returns 409 when the badge is already assigned, without checking in", async () => {
    eventConfig.getCheckInEventConfig.mockReturnValue(CONFIG);
    applicationModel.findById.mockResolvedValue(CONFIRMED);
    mappingModel.findOne.mockResolvedValue({ _id: MAPPING_ID, qrCodeNumber: 7, applicationId: "64c0000000000000000000ff", checkedInAt: null });

    const res = await patch({ status: "Checked-in", qrCodeNumber: 7 });

    expect(res.status).toBe(409);
    expect(applicationModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("creates no meal record when EVENT_MEALS is empty", async () => {
    happyPath();
    eventConfig.getCheckInEventConfig.mockReturnValue({ ...CONFIG, meals: [] });

    expect((await patch({ status: "Checked-in", qrCodeNumber: 8 })).status).toBe(200);
    expect(mealModel.create).not.toHaveBeenCalled();
    expect(mealModel.exists).not.toHaveBeenCalled();
  });

  it("reuses the applicant's own unused badge mapping with a conditional claim instead of refusing it", async () => {
    happyPath();
    mappingModel.findOne.mockResolvedValue({ _id: MAPPING_ID, applicationId: USER_ID, checkedInAt: null });
    mappingModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const res = await patch({ status: "Checked-in", qrCodeNumber: 7 });

    expect(res.status).toBe(200);
    expect(mappingModel.create).not.toHaveBeenCalled();
    expect(mappingModel.updateOne).toHaveBeenCalledTimes(1);
    expect(mappingModel.updateOne).toHaveBeenCalledWith(
      { _id: MAPPING_ID, checkedInAt: null },
      { $set: { checkedInAt: expect.any(Date), checkedInBy: TEST_ADMIN_EMAIL } },
    );
  });

  it("returns 409 when the applicant's own badge mapping was already used for a check-in", async () => {
    happyPath();
    mappingModel.findOne.mockResolvedValue({ _id: MAPPING_ID, applicationId: USER_ID, checkedInAt: new Date() });

    const res = await patch({ status: "Checked-in", qrCodeNumber: 7 });

    expect(res.status).toBe(409);
    expect(mappingModel.updateOne).not.toHaveBeenCalled();
    expect(applicationModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("returns 409 when a concurrent request claimed the applicant's own mapping first", async () => {
    happyPath();
    mappingModel.findOne.mockResolvedValue({ _id: MAPPING_ID, applicationId: USER_ID, checkedInAt: null });
    mappingModel.updateOne.mockResolvedValue({ modifiedCount: 0 });

    expect((await patch({ status: "Checked-in", qrCodeNumber: 7 })).status).toBe(409);
    expect(applicationModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("releases a reused mapping (only if still ours) instead of deleting it when the status write loses", async () => {
    happyPath();
    mappingModel.findOne.mockResolvedValue({ _id: MAPPING_ID, applicationId: USER_ID, checkedInAt: null });
    mappingModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
    applicationModel.findOneAndUpdate.mockResolvedValue(null);

    expect((await patch({ status: "Checked-in", qrCodeNumber: 7 })).status).toBe(409);
    expect(mappingModel.deleteOne).not.toHaveBeenCalled();
    const claimedAt = mappingModel.updateOne.mock.calls[0][1].$set.checkedInAt;
    expect(mappingModel.updateOne).toHaveBeenLastCalledWith(
      { _id: MAPPING_ID, checkedInAt: claimedAt },
      { $set: { checkedInAt: null } },
    );
  });

  it("maps a duplicate-key error on the badge (a concurrent claim) to 409 without checking in", async () => {
    happyPath();
    mappingModel.create.mockRejectedValue(duplicateKeyError());

    const res = await patch({ status: "Checked-in", qrCodeNumber: 7 });

    expect(res.status).toBe(409);
    expect((await res.json()).message).toBe("Badge already assigned");
    expect(applicationModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(mappingModel.deleteOne).not.toHaveBeenCalled();
  });

  it("returns 500 without checking in when creating the badge mapping fails otherwise", async () => {
    happyPath();
    mappingModel.create.mockRejectedValue(new Error("connection reset"));

    expect((await patch({ status: "Checked-in", qrCodeNumber: 7 })).status).toBe(500);
    expect(applicationModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("returns 409 and releases the badge when the applicant is no longer Confirmed at write time", async () => {
    happyPath();
    applicationModel.findOneAndUpdate.mockResolvedValue(null);

    const res = await patch({ status: "Checked-in", qrCodeNumber: 7 });

    expect(res.status).toBe(409);
    expect(mappingModel.deleteOne).toHaveBeenCalledWith({ _id: MAPPING_ID });
    expect(mealModel.create).not.toHaveBeenCalled();
  });

  it("returns 409 with no badge to release when no badge number was given and the write loses the race", async () => {
    happyPath();
    applicationModel.findOneAndUpdate.mockResolvedValue(null);

    expect((await patch({ status: "Checked-in" })).status).toBe(409);
    expect(mappingModel.create).not.toHaveBeenCalled();
    expect(mappingModel.deleteOne).not.toHaveBeenCalled();
  });

  it("releases the badge and returns 500 when the status write throws", async () => {
    happyPath();
    applicationModel.findOneAndUpdate.mockRejectedValue(new Error("connection reset"));

    const res = await patch({ status: "Checked-in", qrCodeNumber: 7 });

    expect(res.status).toBe(500);
    expect(mappingModel.deleteOne).toHaveBeenCalledWith({ _id: MAPPING_ID });
  });

  it("still returns 500 when releasing the badge fails too, and logs no applicant data", async () => {
    happyPath();
    applicationModel.findOneAndUpdate.mockRejectedValue(new Error("connection reset"));
    mappingModel.deleteOne.mockRejectedValue(Object.assign(new Error("ada@example.com"), { code: 91 }));

    const res = await patch({ status: "Checked-in", qrCodeNumber: 7 });

    expect(res.status).toBe(500);
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).not.toContain("ada@example.com");
    expect(logged).not.toContain(USER_ID);
  });

  it("does not create a second meal record when one already exists for the email", async () => {
    happyPath();
    mealModel.exists.mockResolvedValue({ _id: "64c0000000000000000000ff" });

    const res = await patch({ status: "Checked-in", qrCodeNumber: 7 });

    expect(res.status).toBe(200);
    expect(mealModel.exists).toHaveBeenCalledWith({ email: "ada@example.com" });
    expect(mealModel.create).not.toHaveBeenCalled();
  });

  it("still returns 200 when seeding the meal record fails, keeping the badge, and logs no applicant data", async () => {
    happyPath();
    mealModel.create.mockRejectedValue(
      Object.assign(new Error('E11000 duplicate key error dup key: { email: "ada@example.com" }'), { code: 11000 }),
    );

    const res = await patch({ status: "Checked-in", qrCodeNumber: 7 });

    expect(res.status).toBe(200);
    expect(mappingModel.deleteOne).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("ada@example.com");
  });

  it.each([1.5, -3, 2 ** 53, 1e20, "7"])("returns 400 for the badge number %j", async (qrCodeNumber) => {
    happyPath();
    expect((await patch({ status: "Checked-in", qrCodeNumber })).status).toBe(400);
    expect(applicationModel.findById).not.toHaveBeenCalled();
  });

  it("changes nothing when the event settings are broken", async () => {
    eventConfig.getCheckInEventConfig.mockImplementationOnce(() => {
      throw new Error("Missing required environment variable EVENT_ID");
    });

    const res = await patch({ status: "Checked-in", qrCodeNumber: 7 });

    expect(res.status).toBe(500);
    expect(applicationModel.findById).not.toHaveBeenCalled();
  });

  it("names EVENT_MEALS when the meal schedule is missing, and changes nothing", async () => {
    eventConfig.getCheckInEventConfig.mockImplementationOnce(() => {
      throw Object.assign(new Error("Missing required environment variable EVENT_MEALS"), { variable: "EVENT_MEALS" });
    });

    const res = await patch({ status: "Checked-in", qrCodeNumber: 7 });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.message).toBe("Event settings are incomplete: EVENT_MEALS");
    expect(applicationModel.findById).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid user id or badge number", async () => {
    eventConfig.getCheckInEventConfig.mockReturnValue(CONFIG);
    expect((await patch({ status: "Checked-in" }, "not-an-id")).status).toBe(400);
    expect((await patch({ status: "Checked-in", qrCodeNumber: 0 })).status).toBe(400);
    expect(applicationModel.findById).not.toHaveBeenCalled();
  });
});
