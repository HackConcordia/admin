import { describe, expect, it } from "vitest";

import {
  DEFAULT_CONTACT_EMAIL,
  EventConfigError,
  parseMealSlots,
  readCheckInEventConfig,
  readEmailEventConfig,
  readContactEmail,
  readEventConfig,
} from "@/config/event";

const DEFAULT_TRAVEL_EN = "https://drive.google.com/file/d/1-7HbWwvpoTLa2Mpw406qMu4K0Dit9GOt/view?usp=drive_link";
const DEFAULT_TRAVEL_FR = "https://drive.google.com/file/d/1Bqh9FSkdL2RlPJEXvq7vAmCLb-T9pM1W/view?usp=drive_link";

const ENV = {
  EVENT_ID: " 6700000000000000000DEC26 ",
  EVENT_NAME: "ConUHacks XI",
  REGISTRATION_URL: "https://register.conuhacks.io/dashboard",
  EVENT_MEALS: '[{"date":"2026-11-28","type":"breakfast"},{"date":"2026-11-28","type":"lunch"}]',
};

describe("parseMealSlots", () => {
  it("returns no meals for an unset or blank value", () => {
    expect(parseMealSlots(undefined)).toEqual([]);
    expect(parseMealSlots("  ")).toEqual([]);
    expect(parseMealSlots("[]")).toEqual([]);
  });

  it("parses the contract C5 shape", () => {
    expect(parseMealSlots(ENV.EVENT_MEALS)).toEqual([
      { date: "2026-11-28", type: "breakfast" },
      { date: "2026-11-28", type: "lunch" },
    ]);
  });

  it("rejects malformed schedules with a message naming the entry", () => {
    expect(() => parseMealSlots("not json")).toThrow("EVENT_MEALS is not valid JSON");
    expect(() => parseMealSlots('{"date":"2026-11-28","type":"lunch"}')).toThrow("EVENT_MEALS must be a JSON array");
    expect(() => parseMealSlots('["lunch"]')).toThrow("EVENT_MEALS[0] must be an object");
    expect(() => parseMealSlots('[{"date":"2026-02-30","type":"lunch"}]')).toThrow(
      "EVENT_MEALS[0].date must be a real date in YYYY-MM-DD format",
    );
    expect(() => parseMealSlots('[{"date":"2026-11-28","type":"brunch"}]')).toThrow(
      "EVENT_MEALS[0].type must be one of breakfast, lunch, snacks, dinner",
    );
  });
});

describe("readEventConfig", () => {
  it("reads every value, lowercases EVENT_ID and defaults the optional ones", () => {
    expect(readEventConfig(ENV)).toEqual({
      eventId: "6700000000000000000dec26",
      eventName: "ConUHacks XI",
      registrationUrl: "https://register.conuhacks.io/dashboard",
      discordInviteUrl: null,
      travelGuidelinesUrl: DEFAULT_TRAVEL_EN,
      travelGuidelinesUrlFr: DEFAULT_TRAVEL_FR,
      meals: [
        { date: "2026-11-28", type: "breakfast" },
        { date: "2026-11-28", type: "lunch" },
      ],
    });
  });

  it("reads the optional travel guideline links (https only) and lets them override the defaults", () => {
    expect(
      readEventConfig({ ...ENV, TRAVEL_GUIDELINES_URL: "https://example.org/en", TRAVEL_GUIDELINES_URL_FR: "https://example.org/fr" }),
    ).toMatchObject({ travelGuidelinesUrl: "https://example.org/en", travelGuidelinesUrlFr: "https://example.org/fr" });
    expect(() => readEventConfig({ ...ENV, TRAVEL_GUIDELINES_URL: "javascript:alert(1)" })).toThrow(
      "TRAVEL_GUIDELINES_URL must be an absolute https URL",
    );
    expect(() => readEventConfig({ ...ENV, TRAVEL_GUIDELINES_URL_FR: "nope" })).toThrow(
      "TRAVEL_GUIDELINES_URL_FR must be an absolute https URL",
    );
  });

  it("falls back to the default guideline links when the variables are blank", () => {
    expect(readEventConfig({ ...ENV, TRAVEL_GUIDELINES_URL: "  ", TRAVEL_GUIDELINES_URL_FR: "" })).toMatchObject({
      travelGuidelinesUrl: DEFAULT_TRAVEL_EN,
      travelGuidelinesUrlFr: DEFAULT_TRAVEL_FR,
    });
  });

  it("names the missing variable", () => {
    const { EVENT_NAME: _omitted, ...rest } = ENV;
    expect(() => readEventConfig(rest)).toThrow("Missing required environment variable EVENT_NAME");
  });

  it("rejects an EVENT_ID that isn't a 24-character hex ObjectId", () => {
    expect(() => readEventConfig({ ...ENV, EVENT_ID: "hackdec2026" })).toThrow(
      "EVENT_ID must be a 24-character hex MongoDB ObjectId",
    );
  });

  it("only accepts absolute https URLs", () => {
    expect(() => readEventConfig({ ...ENV, REGISTRATION_URL: "javascript:alert(1)" })).toThrow(
      "REGISTRATION_URL must be an absolute https URL",
    );
    expect(() => readEventConfig({ ...ENV, DISCORD_INVITE_URL: "discord.gg/abc" })).toThrow(
      "DISCORD_INVITE_URL must be an absolute https URL",
    );
    expect(readEventConfig({ ...ENV, DISCORD_INVITE_URL: "https://discord.gg/abc" }).discordInviteUrl).toBe(
      "https://discord.gg/abc",
    );
  });

  it("refuses plain http for REGISTRATION_URL and DISCORD_INVITE_URL, except on localhost", () => {
    expect(() => readEventConfig({ ...ENV, REGISTRATION_URL: "http://register.conuhacks.io/dashboard" })).toThrow(
      "REGISTRATION_URL must be an absolute https URL (http is allowed only for localhost)",
    );
    expect(() => readEventConfig({ ...ENV, DISCORD_INVITE_URL: "http://discord.gg/abc" })).toThrow(
      "DISCORD_INVITE_URL must be an absolute https URL (http is allowed only for localhost)",
    );
    expect(() => readEventConfig({ ...ENV, REGISTRATION_URL: "http://localhost.evil.dev/dashboard" })).toThrow(
      "REGISTRATION_URL must be an absolute https URL",
    );
    expect(readEventConfig({ ...ENV, REGISTRATION_URL: "http://localhost:3000/dashboard" }).registrationUrl).toBe(
      "http://localhost:3000/dashboard",
    );
    // The email kit rejects every other http link, so a loopback IP would save decisions whose emails fail.
    expect(() => readEventConfig({ ...ENV, REGISTRATION_URL: "http://127.0.0.1:3000/dashboard" })).toThrow(
      "REGISTRATION_URL must be an absolute https URL",
    );
  });

  it("validates CONTACT_EMAIL when it is set", () => {
    expect(() => readContactEmail({ CONTACT_EMAIL: "not-an-email" })).toThrow("CONTACT_EMAIL must be an email address");
    expect(readContactEmail({})).toBe(DEFAULT_CONTACT_EMAIL);
    expect(readContactEmail({ CONTACT_EMAIL: "technology.hackconcordia@ecaconcordia.ca" })).toBe(
      "technology.hackconcordia@ecaconcordia.ca",
    );
  });
});

describe("split readers", () => {
  const { EVENT_ID: _id, EVENT_MEALS: _meals, ...EMAIL_ONLY } = ENV;

  it("reads the email settings without EVENT_ID or EVENT_MEALS, and ignores bad values of them", () => {
    expect(readEmailEventConfig(EMAIL_ONLY)).toMatchObject({ eventName: "ConUHacks XI", registrationUrl: ENV.REGISTRATION_URL });
    expect(readEmailEventConfig({ ...EMAIL_ONLY, EVENT_ID: "placeholder", EVENT_MEALS: "not json" })).not.toHaveProperty("meals");
    expect(readEmailEventConfig(EMAIL_ONLY)).not.toHaveProperty("eventId");
  });

  it("still validates the email settings", () => {
    expect(() => readEmailEventConfig({ ...EMAIL_ONLY, REGISTRATION_URL: "nope" })).toThrow("REGISTRATION_URL must be an absolute https URL");
  });

  it("reads the check-in settings without the email ones", () => {
    expect(readCheckInEventConfig({ EVENT_ID: ENV.EVENT_ID, EVENT_MEALS: ENV.EVENT_MEALS })).toEqual({
      eventId: "6700000000000000000dec26",
      meals: [
        { date: "2026-11-28", type: "breakfast" },
        { date: "2026-11-28", type: "lunch" },
      ],
    });
  });

  it.each([undefined, "", "  ", "[]"])("requires EVENT_MEALS for check-in (%j)", (meals) => {
    const attempt = () => readCheckInEventConfig({ EVENT_ID: ENV.EVENT_ID, EVENT_MEALS: meals });
    expect(attempt).toThrow(EventConfigError);
    try {
      attempt();
    } catch (error) {
      expect((error as EventConfigError).variable).toBe("EVENT_MEALS");
    }
  });

  it("names EVENT_ID and bad EVENT_MEALS as the variable at fault", () => {
    const variable = (env: Record<string, string>) => {
      try {
        readCheckInEventConfig(env);
      } catch (error) {
        return (error as EventConfigError).variable;
      }
      return "no error";
    };
    expect(variable({ EVENT_MEALS: ENV.EVENT_MEALS })).toBe("EVENT_ID");
    expect(variable({ EVENT_ID: ENV.EVENT_ID, EVENT_MEALS: "not json" })).toBe("EVENT_MEALS");
    expect(variable({ EVENT_ID: "nope", EVENT_MEALS: ENV.EVENT_MEALS })).toBe("EVENT_ID");
  });
});
