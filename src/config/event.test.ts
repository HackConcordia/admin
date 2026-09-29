import { describe, expect, it } from "vitest";

import { DEFAULT_CONTACT_EMAIL, parseMealSlots, readEventConfig } from "@/config/event";

const DEFAULT_TRAVEL_EN = "https://drive.google.com/file/d/1-7HbWwvpoTLa2Mpw406qMu4K0Dit9GOt/view?usp=drive_link";
const DEFAULT_TRAVEL_FR = "https://drive.google.com/file/d/1Bqh9FSkdL2RlPJEXvq7vAmCLb-T9pM1W/view?usp=drive_link";

const ENV = {
  EVENT_ID: " 6700000000000000000DEC26 ",
  EVENT_NAME: "ConUHacks XI",
  EVENT_DATES_LABEL: "Saturday, November 28, 2026",
  EVENT_DATES_LABEL_FR: "samedi 28 novembre 2026",
  EVENT_VENUE: "the John Molson Building (JMSB), SGW Campus, Concordia University",
  EVENT_VENUE_FR: "l'édifice John Molson (JMSB), campus SGW, Université Concordia",
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
      eventDatesLabel: "Saturday, November 28, 2026",
      eventDatesLabelFr: "samedi 28 novembre 2026",
      venue: ENV.EVENT_VENUE,
      venueFr: ENV.EVENT_VENUE_FR,
      registrationUrl: "https://register.conuhacks.io/dashboard",
      contactEmail: DEFAULT_CONTACT_EMAIL,
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
    expect(readEventConfig({ ...ENV, REGISTRATION_URL: "http://127.0.0.1:3000/dashboard" }).registrationUrl).toBe(
      "http://127.0.0.1:3000/dashboard",
    );
  });

  it("validates CONTACT_EMAIL when it is set", () => {
    expect(() => readEventConfig({ ...ENV, CONTACT_EMAIL: "not-an-email" })).toThrow(
      "CONTACT_EMAIL must be an email address",
    );
    expect(readEventConfig({ ...ENV, CONTACT_EMAIL: "technology.hackconcordia@ecaconcordia.ca" }).contactEmail).toBe(
      "technology.hackconcordia@ecaconcordia.ca",
    );
  });
});
