import { afterEach, describe, expect, it, vi } from "vitest";

const sendgrid = vi.hoisted(() => ({ setApiKey: vi.fn(), send: vi.fn(async () => [{}]) }));
vi.mock("@sendgrid/mail", () => ({ default: sendgrid }));

import { DEFAULT_CONTACT_EMAIL } from "@/config/event";
import { assertEmailSettings, sendEmail } from "@/utils/sendEmail";

const TO = "ada.lovelace@example.com";
const ADMITTED = {
  fullName: "Ada Lovelace",
  dashboardUrl: "https://register.conuhacks.io/dashboard",
};

function useSendGrid(): void {
  vi.stubEnv("SENDGRID_API_KEY", "SG.test-key");
  vi.stubEnv("SENDGRID_FROM_EMAIL", "team.hackconcordia@ecaconcordia.ca");
}

/** Everything console.log / console.error received during the call, as one string. */
function captureLogs(): () => string {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  return () => [...log.mock.calls, ...error.mock.calls].map((args) => args.map(String).join(" ")).join("\n");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendEmail", () => {
  it("renders the kit and sends html + text from SENDGRID_FROM_EMAIL, replying to CONTACT_EMAIL", async () => {
    useSendGrid();
    vi.stubEnv("CONTACT_EMAIL", "organizers@hackconcordia.io");

    expect(await sendEmail("admitted", { to: TO, lang: "en", data: ADMITTED })).toBe(true);

    expect(sendgrid.setApiKey).toHaveBeenCalledWith("SG.test-key");
    expect(sendgrid.send).toHaveBeenCalledTimes(1);
    const message = (sendgrid.send.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(message).toMatchObject({
      to: TO,
      from: { email: "team.hackconcordia@ecaconcordia.ca", name: "HackConcordia" },
      replyTo: { email: "organizers@hackconcordia.io", name: "HackConcordia" },
      subject: "You have been admitted to ConUHacks XI! Please confirm your attendance",
    });
    expect(message.html).toContain("Ada Lovelace");
    expect(message.html).toContain(ADMITTED.dashboardUrl);
    expect(message.text).toContain(ADMITTED.dashboardUrl);
  });

  it("replies to the default contact address when CONTACT_EMAIL is unset", async () => {
    useSendGrid();
    vi.stubEnv("CONTACT_EMAIL", "");

    await sendEmail("refused", { to: TO, lang: "fr", data: { fullName: "Élodie Côté" } });

    expect(sendgrid.send).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: { email: DEFAULT_CONTACT_EMAIL, name: "HackConcordia" } }),
    );
  });

  it("sends French only, English only, or French then English", async () => {
    useSendGrid();
    await sendEmail("waitlisted", { to: TO, lang: "fr", data: { fullName: "Ada" } });
    await sendEmail("waitlisted", { to: TO, lang: "en", data: { fullName: "Ada" } });
    await sendEmail("waitlisted", { to: TO, lang: "bilingual", data: { fullName: "Ada" } });

    const subjects = sendgrid.send.mock.calls.map((call) => ((call as unknown[])[0] as { subject: string }).subject);
    expect(subjects).toEqual([
      "Vous avez été placé(e) sur la liste d'attente pour ConUHacks XI",
      "You have been waitlisted for ConUHacks XI",
      "Vous avez été placé(e) sur la liste d'attente pour ConUHacks XI // You have been waitlisted for ConUHacks XI",
    ]);
  });

  it("only logs, without the address, when SENDGRID_API_KEY is empty (local and preview)", async () => {
    vi.stubEnv("SENDGRID_API_KEY", "");
    const logs = captureLogs();

    expect(await sendEmail("discordInvite", { to: TO, lang: "en", data: { fullName: "Ada", discordUrl: "https://discord.gg/conuhacks" } })).toBe(true);

    expect(sendgrid.send).not.toHaveBeenCalled();
    expect(logs()).toContain("[Email Stub] discordInvite (en)");
    expect(logs()).not.toContain(TO);
  });

  it("returns false when the API key is set but the sender is missing", async () => {
    vi.stubEnv("SENDGRID_API_KEY", "SG.test-key");
    vi.stubEnv("SENDGRID_FROM_EMAIL", "");
    captureLogs();

    expect(await sendEmail("refused", { to: TO, lang: "en", data: { fullName: "Ada" } })).toBe(false);
    expect(sendgrid.send).not.toHaveBeenCalled();
  });

  it("returns false and never throws or logs the address when SendGrid fails", async () => {
    useSendGrid();
    const logs = captureLogs();
    sendgrid.send.mockRejectedValueOnce(Object.assign(new Error(`Bad recipient ${TO}`), { code: 400 }));

    expect(await sendEmail("refused", { to: TO, lang: "en", data: { fullName: "Ada" } })).toBe(false);

    expect(logs()).toContain("[Email] Failed to send refused (en): Error (code 400)");
    expect(logs()).not.toContain(TO);
  });

  it("returns false without sending when a link is not https (the kit refuses to render it)", async () => {
    useSendGrid();
    captureLogs();

    const sent = await sendEmail("admitted", { to: TO, lang: "en", data: { ...ADMITTED, dashboardUrl: "javascript:alert(1)" } });

    expect(sent).toBe(false);
    expect(sendgrid.send).not.toHaveBeenCalled();
  });

  it("returns false without a recipient", async () => {
    useSendGrid();
    captureLogs();

    expect(await sendEmail("refused", { to: "  ", lang: "en", data: { fullName: "Ada" } })).toBe(false);
    expect(sendgrid.send).not.toHaveBeenCalled();
  });
});

describe("assertEmailSettings", () => {
  it("passes with a valid or unset CONTACT_EMAIL, and in stub mode without a sender", () => {
    vi.stubEnv("SENDGRID_API_KEY", "");
    vi.stubEnv("SENDGRID_FROM_EMAIL", "");
    vi.stubEnv("CONTACT_EMAIL", "");
    expect(() => assertEmailSettings()).not.toThrow();
    vi.stubEnv("CONTACT_EMAIL", "organizers@hackconcordia.io");
    expect(() => assertEmailSettings()).not.toThrow();
  });

  it("throws on a CONTACT_EMAIL that sendEmail would fail on (so routes refuse before writing)", async () => {
    useSendGrid();
    vi.stubEnv("CONTACT_EMAIL", "organizers@");
    const logs = captureLogs();

    expect(() => assertEmailSettings()).toThrow("CONTACT_EMAIL must be an email address");
    expect(await sendEmail("waitlisted", { to: TO, lang: "en", data: { fullName: "Ada" } })).toBe(false);
    expect(logs()).not.toContain(TO);
  });

  it("throws when SENDGRID_API_KEY is set without SENDGRID_FROM_EMAIL", () => {
    vi.stubEnv("SENDGRID_API_KEY", "SG.test-key");
    vi.stubEnv("SENDGRID_FROM_EMAIL", "");
    expect(() => assertEmailSettings()).toThrow("SENDGRID_FROM_EMAIL is not set");
  });
});
