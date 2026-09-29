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

  it("rejects an invalid value without writing", async () => {
    const res = await put({ ...NAMES, github: "javascript:alert(1)" });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ message: "github must be an http(s) link", error: null });
    expect(applicationModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("saves an unrelated change when the body resends an unchanged off-list city, and refuses a changed one", async () => {
    applicationModel.findById.mockResolvedValue({ ...STORED, country: "CA", city: "Atlantis", comments: "old" });

    const ok = await put({ ...NAMES, country: "CA", city: "Atlantis", comments: "new note" });
    expect(ok.status).toBe(200);
    expect(applicationModel.findByIdAndUpdate.mock.calls[0][1].$set).toMatchObject({ city: "Atlantis", comments: "new note" });

    applicationModel.findByIdAndUpdate.mockClear();
    const changed = await put({ ...NAMES, country: "CA", city: "Gotham" });
    expect(changed.status).toBe(400);
    await expect(changed.json()).resolves.toMatchObject({ message: "Invalid value for city" });
    expect(applicationModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("saves an unrelated edit of an application with a 250-character schoolOther", async () => {
    const long = "s".repeat(250);
    applicationModel.findById.mockResolvedValue({ ...STORED, school: "other", schoolOther: long });

    const res = await put({ ...NAMES, school: "other", schoolOther: long, comments: "x" });

    expect(res.status).toBe(200);
  });

  it("validates the current year against the stored level when the body omits it", async () => {
    const res = await put({ ...NAMES, currentYear: "Year 9" });

    expect(res.status).toBe(400);
    expect(applicationModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("makes a status override conditional on the status the form loaded and records the session admin", async () => {
    applicationModel.findById.mockResolvedValue({ ...STORED, status: "Admitted" });

    const res = await put({ ...NAMES, status: "Declined", expectedStatus: "Admitted", processedBy: "attacker@evil.dev" });

    expect(res.status).toBe(200);
    expect(applicationModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: APP_ID, status: "Admitted" },
      { $set: expect.objectContaining({ status: "Declined", processedBy: TEST_ADMIN_EMAIL }) },
      { new: true, runValidators: true },
    );
  });

  it("answers 409 when the form's expectedStatus is stale, so a stale form cannot revert a decision", async () => {
    applicationModel.findById.mockResolvedValue({ ...STORED, status: "Admitted" });

    const res = await put({ ...NAMES, status: "Submitted", expectedStatus: "Submitted" });

    expect(res.status).toBe(409);
    expect(applicationModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(applicationModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("also answers 409 when the status changes between the read and the write", async () => {
    applicationModel.findById.mockResolvedValue({ ...STORED, status: "Confirmed" });
    applicationModel.findOneAndUpdate.mockResolvedValue(null);

    const res = await put({ ...NAMES, status: "Declined", expectedStatus: "Confirmed" });

    expect(res.status).toBe(409);
  });

  it("requires expectedStatus for a status change", async () => {
    const res = await put({ ...NAMES, status: "Declined" });

    expect(res.status).toBe(400);
    expect(applicationModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("keeps the status and processedBy on an unrelated edit, also for the legacy CheckedIn spelling", async () => {
    applicationModel.findById.mockResolvedValue({ ...STORED, status: "CheckedIn" });

    const res = await put({ ...NAMES, status: "Checked-in", expectedStatus: "CheckedIn", comments: "hi" });

    expect(res.status).toBe(200);
    expect(applicationModel.findOneAndUpdate).not.toHaveBeenCalled();
    const [, update] = applicationModel.findByIdAndUpdate.mock.calls[0];
    expect(update.$set).not.toHaveProperty("status");
    expect(update.$set).not.toHaveProperty("processedBy");
    expect(update.$set.comments).toBe("hi");
  });

  it.each(["Admitted", "Waitlisted", "Refused"])("refuses to set %s through PUT and points to the decision buttons", async (status) => {
    const res = await put({ ...NAMES, status, expectedStatus: "Submitted" });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toMatch(/decision/i);
    expect(applicationModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("creates the check-in record and sends the Discord email when moving to Confirmed", async () => {
    applicationModel.findById.mockResolvedValue({ ...STORED, status: "Admitted" });

    const res = await put({ ...NAMES, status: "Confirmed", expectedStatus: "Admitted" });

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
