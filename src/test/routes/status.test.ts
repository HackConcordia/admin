import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFindByIdMock } from "@/test/admin-lookup";

const applicationModel = vi.hoisted(() => ({ findById: vi.fn(), findOneAndUpdate: vi.fn() }));
const emails = vi.hoisted(() => ({
  sendAdmittedEmail: vi.fn(async () => true),
  sendWaitlistedEmail: vi.fn(async () => true),
  sendRefusedEmail: vi.fn(async () => true),
  sendDiscordLink: vi.fn(async () => true),
}));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: { findById: createFindByIdMock() } }));
vi.mock("@/repository/models/application", () => ({ default: applicationModel }));
vi.mock("@/utils/admissionEmailConfig", () => emails);

import * as status from "@/app/api/(group)/status/[applicationId]/route";
import { runGuardCases } from "@/test/guard-cases";
import { NON_SUPER_ADMIN_ID, TEST_ADMIN_EMAIL, adminCookie, buildRequest, routeContext } from "@/test/http";

const APP_ID = "64c000000000000000000001";
const APPLICANT = { _id: APP_ID, email: "hacker@test.dev", firstName: "H", lastName: "K", status: "Submitted", travelReimbursement: true };

runGuardCases([
  { name: "PATCH /api/status/[id]", handler: status.PATCH, method: "PATCH", url: `/api/status/${APP_ID}`, level: "any", params: { applicationId: APP_ID } },
]);

/** Signs in as the super admin by default; `regular: true` signs in as a DB-confirmed regular admin. */
async function patch(body: unknown, options: { id?: string; regular?: boolean } = {}) {
  const id = options.id ?? APP_ID;
  const cookie = await adminCookie(options.regular ? { adminId: NON_SUPER_ADMIN_ID } : {});
  return status.PATCH(buildRequest(`/api/status/${id}`, { method: "PATCH", cookie, body }), routeContext({ applicationId: id }));
}

// The real config reader runs against these values: the decision emails need only the email settings.
const EMAIL_ENV = {
  EVENT_NAME: "ConUHacks XI",
  EVENT_DATES_LABEL: "Saturday, February 6 and Sunday, February 7, 2027",
  EVENT_DATES_LABEL_FR: "samedi 6 et dimanche 7 février 2027",
  EVENT_VENUE: "JMSB",
  EVENT_VENUE_FR: "JMSB",
  REGISTRATION_URL: "https://register.conuhacks.io/dashboard",
};

function stubEnv(env: Record<string, string>) {
  for (const name of ["EVENT_ID", "EVENT_MEALS", ...Object.keys(EMAIL_ENV)]) vi.stubEnv(name, env[name] ?? "");
}

beforeEach(() => {
  stubEnv(EMAIL_ENV);
  applicationModel.findById.mockResolvedValue(APPLICANT);
  applicationModel.findOneAndUpdate.mockResolvedValue({ _id: APP_ID });
});

const TRAVEL_DECISION_UNSET = { isTravelReimbursementApproved: "", travelReimbursementAmount: "", travelReimbursementCurrency: "" };

describe("PATCH /api/status/[applicationId]", () => {
  it("refuses before writing anything while an email setting is missing", async () => {
    stubEnv({ ...EMAIL_ENV, EVENT_NAME: "" });

    const res = await patch({ action: "admit" });

    expect(res.status).toBe(500);
    expect(applicationModel.findById).not.toHaveBeenCalled();
    expect(applicationModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it.each(["admit", "waitlist", "reject"])("still decides (%s) when EVENT_ID and EVENT_MEALS are missing or invalid", async (action) => {
    for (const bad of [{}, { EVENT_ID: "placeholder", EVENT_MEALS: "not json" }]) {
      stubEnv({ ...EMAIL_ENV, ...bad });
      applicationModel.findOneAndUpdate.mockClear();

      const res = await patch({ action });

      expect(res.status).toBe(200);
      expect(applicationModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    }
  });

  it("records the logged-in admin as processedBy, conditional on the status it read", async () => {
    const res = await patch({ action: "waitlist", adminEmail: "attacker@evil.dev" });

    expect(res.status).toBe(200);
    expect(applicationModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: APP_ID, status: { $in: ["Submitted", "Admitted", "Waitlisted", "Refused"], $eq: "Submitted" } },
      { $set: expect.objectContaining({ processedBy: TEST_ADMIN_EMAIL, status: "Waitlisted" }), $unset: TRAVEL_DECISION_UNSET },
      { new: true },
    );
    expect(emails.sendWaitlistedEmail).toHaveBeenCalledWith("hacker@test.dev", "H", "K");
  });

  it("stores an approved travel decision from a super admin and passes it to the admission email", async () => {
    const res = await patch({ action: "admit", travelReimbursement: { approved: true, amount: 150, currency: "CAD" } });

    expect(res.status).toBe(200);
    expect(applicationModel.findOneAndUpdate.mock.calls[0][1]).toEqual({
      $set: expect.objectContaining({
        status: "Admitted",
        isTravelReimbursementApproved: true,
        travelReimbursementAmount: 150,
        travelReimbursementCurrency: "CAD",
      }),
    });
    expect(emails.sendAdmittedEmail).toHaveBeenCalledWith("hacker@test.dev", "H", "K", { approved: true, amount: 150, currency: "CAD" });
  });

  it("clears a stale amount when the decision is a refusal", async () => {
    await patch({ action: "admit", travelReimbursement: { approved: false } });

    expect(applicationModel.findOneAndUpdate.mock.calls[0][1]).toEqual({
      $set: expect.objectContaining({ isTravelReimbursementApproved: false }),
      $unset: { travelReimbursementAmount: "", travelReimbursementCurrency: "" },
    });
  });

  describe("travel decisions are super-admin-only (A2)", () => {
    it.each([
      ["an approval", { approved: true, amount: 100, currency: "CAD" }],
      ["a decline", { approved: false }],
      ["an amount only", { amount: 50 }],
      ["a currency only", { currency: "USD" }],
    ])("answers 403 to a regular admin sending %s, before any read or write", async (_name, travelReimbursement) => {
      const res = await patch({ action: "admit", travelReimbursement }, { regular: true });

      expect(res.status).toBe(403);
      expect(applicationModel.findById).not.toHaveBeenCalled();
      expect(applicationModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(emails.sendAdmittedEmail).not.toHaveBeenCalled();
    });

    it("answers 403 to a regular admin even when the decision is malformed or sent with another action", async () => {
      expect((await patch({ action: "admit", travelReimbursement: { approved: true, amount: 500, currency: "CAD" } }, { regular: true })).status).toBe(403);
      expect((await patch({ action: "waitlist", travelReimbursement: { approved: true, amount: 10, currency: "CAD" } }, { regular: true })).status).toBe(403);
      expect(applicationModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it("lets a regular admin admit without a decision, leaving the stored travel fields untouched", async () => {
      const res = await patch({ action: "admit" }, { regular: true });

      expect(res.status).toBe(200);
      const update = applicationModel.findOneAndUpdate.mock.calls[0][1];
      expect(update.$set).toMatchObject({ status: "Admitted", processedBy: TEST_ADMIN_EMAIL });
      expect(update.$set).not.toHaveProperty("isTravelReimbursementApproved");
      expect(update.$set).not.toHaveProperty("travelReimbursementAmount");
      expect(update.$set).not.toHaveProperty("travelReimbursementCurrency");
      expect(update).not.toHaveProperty("$unset");
      expect(emails.sendAdmittedEmail).toHaveBeenCalledWith("hacker@test.dev", "H", "K", undefined);
    });

    it("lets a regular admin waitlist and refuse", async () => {
      expect((await patch({ action: "waitlist" }, { regular: true })).status).toBe(200);
      expect((await patch({ action: "reject" }, { regular: true })).status).toBe(200);
    });

    it("clears a stored travel approval when a regular admin waitlists or refuses (L1)", async () => {
      for (const action of ["waitlist", "reject"]) {
        applicationModel.findOneAndUpdate.mockClear();
        expect((await patch({ action }, { regular: true })).status).toBe(200);
        const update = applicationModel.findOneAndUpdate.mock.calls[0][1];
        expect(update.$unset).toEqual(TRAVEL_DECISION_UNSET);
        expect(update.$set).not.toHaveProperty("isTravelReimbursementApproved");
      }
    });

    it("treats a null travelReimbursement as no decision for a regular admin", async () => {
      expect((await patch({ action: "admit", travelReimbursement: null }, { regular: true })).status).toBe(200);
    });
  });

  it("refuses a travel decision for an applicant who didn't ask (409, nothing written)", async () => {
    applicationModel.findById.mockResolvedValue({ ...APPLICANT, travelReimbursement: null });

    const res = await patch({ action: "admit", travelReimbursement: { approved: true, amount: 100, currency: "CAD" } });

    expect(res.status).toBe(409);
    expect(applicationModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(emails.sendAdmittedEmail).not.toHaveBeenCalled();
  });

  it("enforces the amount limits: CAD up to 150, USD up to 100, before touching the database", async () => {
    for (const travelReimbursement of [
      { approved: true, amount: 151, currency: "CAD" },
      { approved: true, amount: 101, currency: "USD" },
      { approved: true, amount: 0, currency: "CAD" },
      { approved: true, amount: 50, currency: "EUR" },
    ]) {
      expect((await patch({ action: "admit", travelReimbursement })).status).toBe(400);
    }
    expect(applicationModel.findById).not.toHaveBeenCalled();

    expect((await patch({ action: "admit", travelReimbursement: { approved: true, amount: 100, currency: "USD" } })).status).toBe(200);
  });

  it("answers 409 for an undecidable status or a lost race, 400 for a bad action or id", async () => {
    applicationModel.findById.mockResolvedValueOnce({ ...APPLICANT, status: "Confirmed" });
    expect((await patch({ action: "admit" })).status).toBe(409);

    applicationModel.findOneAndUpdate.mockResolvedValueOnce(null);
    expect((await patch({ action: "reject" })).status).toBe(409);

    expect((await patch({ action: "delete" })).status).toBe(400);
    expect((await patch({ action: "admit" }, { id: "nope" })).status).toBe(400);
  });
});
