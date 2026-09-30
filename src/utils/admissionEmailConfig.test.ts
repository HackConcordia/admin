import { afterEach, describe, expect, it, vi } from "vitest";

const sendgrid = vi.hoisted(() => ({ setApiKey: vi.fn(), send: vi.fn(async () => [{}]) }));
const config = vi.hoisted(() => ({
  eventId: "6700000000000000000c0a11",
  eventName: "ConUHacks XI",
  eventDatesLabel: "Saturday, February 6 and Sunday, February 7, 2027",
  eventDatesLabelFr: "samedi 6 et dimanche 7 février 2027",
  venue: "JMSB",
  venueFr: "JMSB",
  registrationUrl: "https://register.conuhacks.io/dashboard",
  contactEmail: "team.hackconcordia@ecaconcordia.ca",
  discordInviteUrl: null as string | null,
  travelGuidelinesUrl: null,
  travelGuidelinesUrlFr: null,
  meals: [],
}));

vi.mock("@sendgrid/mail", () => ({ default: sendgrid }));
vi.mock("@/config/event", () => ({ getEmailEventConfig: () => config }));

import { sendAdmittedEmail, sendDiscordLink } from "@/utils/admissionEmailConfig";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("admission email delivery", () => {
  it("sends from SENDGRID_FROM_EMAIL with the contact address as reply-to", async () => {
    vi.stubEnv("SENDGRID_API_KEY", "SG.test-key");
    vi.stubEnv("SENDGRID_FROM_EMAIL", "team.hackconcordia@ecaconcordia.ca");

    expect(await sendAdmittedEmail("ada@example.com", "Ada", "Lovelace")).toBe(true);

    expect(sendgrid.setApiKey).toHaveBeenCalledWith("SG.test-key");
    expect(sendgrid.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ada@example.com",
        from: { email: "team.hackconcordia@ecaconcordia.ca", name: "HackConcordia" },
        replyTo: { email: "team.hackconcordia@ecaconcordia.ca", name: "HackConcordia" },
        subject: expect.stringContaining("ConUHacks XI"),
      }),
    );
  });

  it("only logs when SENDGRID_API_KEY is empty (local and preview)", async () => {
    vi.stubEnv("SENDGRID_API_KEY", "");
    expect(await sendAdmittedEmail("ada@example.com", "Ada", "Lovelace")).toBe(true);
    expect(sendgrid.send).not.toHaveBeenCalled();
  });

  it("fails when the API key is set but the sender is missing", async () => {
    vi.stubEnv("SENDGRID_API_KEY", "SG.test-key");
    vi.stubEnv("SENDGRID_FROM_EMAIL", "");
    expect(await sendAdmittedEmail("ada@example.com", "Ada", "Lovelace")).toBe(false);
    expect(sendgrid.send).not.toHaveBeenCalled();
  });

  it("skips the Discord email when DISCORD_INVITE_URL is unset", async () => {
    vi.stubEnv("SENDGRID_API_KEY", "SG.test-key");
    vi.stubEnv("SENDGRID_FROM_EMAIL", "team.hackconcordia@ecaconcordia.ca");
    expect(await sendDiscordLink("ada@example.com", "Ada", "Lovelace")).toBe(true);
    expect(sendgrid.send).not.toHaveBeenCalled();
  });

  it("passes the travel decision into the admission email", async () => {
    vi.stubEnv("SENDGRID_API_KEY", "SG.test-key");
    vi.stubEnv("SENDGRID_FROM_EMAIL", "team.hackconcordia@ecaconcordia.ca");

    await sendAdmittedEmail("ada@example.com", "Ada", "Lovelace", { approved: true, amount: 150, currency: "CAD" });

    expect(sendgrid.send).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining("up to 150 CAD") }));
  });

  it("sends the Discord invite when DISCORD_INVITE_URL is configured, and never logs the address", async () => {
    vi.stubEnv("SENDGRID_API_KEY", "");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    config.discordInviteUrl = "https://discord.gg/conuhacks";
    try {
      expect(await sendDiscordLink("ada@example.com", "Ada", "Lovelace")).toBe(true);
      expect(log).toHaveBeenCalledWith(expect.stringContaining("discord-invite"));
      expect(log.mock.calls.flat().join(" ")).not.toContain("ada@example.com");
    } finally {
      config.discordInviteUrl = null;
      log.mockRestore();
    }
  });
});
