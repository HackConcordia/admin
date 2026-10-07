import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sendEmail: vi.fn(async () => true) }));
vi.mock("@/utils/sendEmail", () => mocks);

import { applicantFullName, isDecisionStatus, sendDecisionEmail, sendDiscordInviteEmail } from "@/utils/applicantEmails";

const CONFIG = {
  registrationUrl: "https://register.conuhacks.io",
  discordInviteUrl: null,
  travelGuidelinesUrl: "https://drive.google.com/en",
  travelGuidelinesUrlFr: "https://drive.google.com/fr",
};
const APPLICANT = { email: "a@b.c", firstName: "Ada", lastName: "L", communicationLanguage: "" };

const sentData = () => (mocks.sendEmail.mock.calls[0] as unknown as [string, { data: Record<string, unknown> }])[1].data;

beforeEach(() => {
  mocks.sendEmail.mockClear();
});

describe("applicant emails", () => {
  it("builds the full name from trimmed first and last names", () => {
    expect(applicantFullName({ firstName: " Ada ", lastName: "Lovelace " })).toBe("Ada Lovelace");
    expect(applicantFullName({ firstName: "Ada" })).toBe("Ada");
    expect(applicantFullName({ firstName: null, lastName: 42 })).toBe("");
  });

  it("knows which statuses send a decision email", () => {
    expect(["Admitted", "Waitlisted", "Refused"].every(isDecisionStatus)).toBe(true);
    expect(["Confirmed", "Declined", "toString", "constructor"].some(isDecisionStatus)).toBe(false);
  });

  it("admitted: dashboard link and the travel decision", async () => {
    await sendDecisionEmail("Admitted", { ...APPLICANT, communicationLanguage: "french" }, CONFIG, { approved: true, amount: 150, currency: "CAD" });
    expect(mocks.sendEmail).toHaveBeenCalledWith("admitted", {
      to: "a@b.c",
      lang: "fr",
      data: {
        fullName: "Ada L",
        dashboardUrl: CONFIG.registrationUrl,
        travel: { approved: true, amount: 150, currency: "CAD", guidelinesUrl: { en: CONFIG.travelGuidelinesUrl, fr: CONFIG.travelGuidelinesUrlFr } },
      },
    });
  });

  it("admitted without a travel request has no travel data", async () => {
    await sendDecisionEmail("Admitted", APPLICANT, CONFIG, undefined);
    expect(sentData()).toEqual({ fullName: "Ada L", dashboardUrl: CONFIG.registrationUrl });
  });

  it("admitted with travel declined", async () => {
    await sendDecisionEmail("Admitted", APPLICANT, CONFIG, { approved: false });
    expect(sentData().travel).toEqual({ approved: false });
  });

  it("admitted: a guidelines link that isn't configured is left out", async () => {
    await sendDecisionEmail("Admitted", APPLICANT, { ...CONFIG, travelGuidelinesUrlFr: null }, { approved: true, amount: 100, currency: "USD" });
    expect(sentData().travel).toEqual({ approved: true, amount: 100, currency: "USD", guidelinesUrl: { en: CONFIG.travelGuidelinesUrl } });
  });

  it("admitted: an approval without an amount sends no travel data", async () => {
    await sendDecisionEmail("Admitted", APPLICANT, CONFIG, { approved: true });
    expect(sentData()).toEqual({ fullName: "Ada L", dashboardUrl: CONFIG.registrationUrl });
  });

  it("waitlisted and refused ignore travel and send only the name, in the applicant's language", async () => {
    await sendDecisionEmail("Waitlisted", { ...APPLICANT, email: " a@b.c ", communicationLanguage: "english" }, CONFIG, { approved: true, amount: 1, currency: "CAD" });
    await sendDecisionEmail("Refused", APPLICANT, CONFIG);
    expect(mocks.sendEmail.mock.calls).toEqual([
      ["waitlisted", { to: "a@b.c", lang: "en", data: { fullName: "Ada L" } }],
      ["refused", { to: "a@b.c", lang: "bilingual", data: { fullName: "Ada L" } }],
    ]);
  });

  it.each([null, "discord.gg/x", "http://discord.gg/x"])("Discord invite: not sent with invite URL %j", async (discordInviteUrl) => {
    expect(await sendDiscordInviteEmail(APPLICANT, { ...CONFIG, discordInviteUrl })).toBe(false);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("Discord invite: sent with an https invite URL", async () => {
    await sendDiscordInviteEmail(APPLICANT, { ...CONFIG, discordInviteUrl: "https://discord.gg/conuhacks" });
    expect(mocks.sendEmail).toHaveBeenCalledWith("discordInvite", {
      to: "a@b.c",
      lang: "bilingual",
      data: { fullName: "Ada L", discordUrl: "https://discord.gg/conuhacks" },
    });
  });
});
