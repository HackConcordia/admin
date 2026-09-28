import { describe, expect, it } from "vitest";

import {
  CASE_INSENSITIVE_COLLATION,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  describeError,
  normalizeVolunteerEmail,
  parseNewVolunteer,
  toVolunteerListItem,
} from "@/lib/volunteers";

const VALID = { firstName: "Grace", lastName: "Hopper", email: "grace@test.dev" };
const VOLUNTEER_ID = "64c000000000000000000001";

describe("CASE_INSENSITIVE_COLLATION", () => {
  it("matches the collation event-checkin's login lookup uses", () => {
    expect(CASE_INSENSITIVE_COLLATION).toEqual({ locale: "en", strength: 2 });
  });
});

describe("normalizeVolunteerEmail", () => {
  it("trims and lowercases, like event-checkin's create-volunteer script", () => {
    expect(normalizeVolunteerEmail("  Grace.Hopper@Test.DEV \n")).toBe("grace.hopper@test.dev");
  });
});

describe("parseNewVolunteer", () => {
  it("returns trimmed names and a normalized email", () => {
    expect(parseNewVolunteer({ firstName: "  Grace ", lastName: " Hopper  ", email: " Grace@Test.DEV " })).toEqual({
      ok: true,
      value: { firstName: "Grace", lastName: "Hopper", email: "grace@test.dev" },
    });
  });

  it("ignores extra fields such as password or isSuperAdmin", () => {
    expect(parseNewVolunteer({ ...VALID, password: "chosen-by-caller", isSuperAdmin: true })).toEqual({
      ok: true,
      value: VALID,
    });
  });

  // Each case is wrapped in its own array: it.each spreads array rows into arguments, so a bare
  // ["Grace"] row would arrive as the string "Grace" instead of an array body.
  it.each([[null], ["grace@test.dev"], [["Grace"]], [42]])("rejects a non-object body (%j)", (body) => {
    expect(parseNewVolunteer(body)).toEqual({ ok: false, error: "Request body must be a JSON object" });
  });

  it.each([
    { body: { ...VALID, firstName: "   " }, error: "First name is required" },
    { body: { ...VALID, firstName: undefined }, error: "First name is required" },
    { body: { ...VALID, lastName: { $ne: null } }, error: "Last name is required" },
    {
      body: { ...VALID, firstName: "a".repeat(MAX_NAME_LENGTH + 1) },
      error: `First name must be at most ${MAX_NAME_LENGTH} characters`,
    },
    { body: { ...VALID, email: "" }, error: "Email is required" },
    { body: { ...VALID, email: { $ne: null } }, error: "Email is required" },
    { body: { ...VALID, email: "not-an-email" }, error: "Email is invalid" },
    { body: { ...VALID, email: "two words@test.dev" }, error: "Email is invalid" },
    { body: { ...VALID, email: `${"a".repeat(MAX_EMAIL_LENGTH)}@test.dev` }, error: "Email is invalid" },
  ])("rejects an invalid body with \"$error\"", ({ body, error }) => {
    expect(parseNewVolunteer(body)).toEqual({ ok: false, error });
  });
});

describe("toVolunteerListItem", () => {
  it("returns only the public fields and never the stored password", () => {
    const item = toVolunteerListItem({
      _id: { toString: () => VOLUNTEER_ID },
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@test.dev",
      password: "$2b$12$abcdefghijklmnopqrstuv",
    });

    expect(item).toEqual({
      _id: VOLUNTEER_ID,
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@test.dev",
      needsPasswordReset: false,
    });
    expect(JSON.stringify(item)).not.toContain("$2b$12$");
  });

  it("flags a legacy plaintext or missing password without exposing it", () => {
    const legacy = toVolunteerListItem({ _id: VOLUNTEER_ID, firstName: "A", lastName: "B", email: "a@test.dev", password: "hunter22" });
    const missing = toVolunteerListItem({ _id: VOLUNTEER_ID, firstName: "A", lastName: "B", email: "a@test.dev" });

    expect(legacy.needsPasswordReset).toBe(true);
    expect(missing.needsPasswordReset).toBe(true);
    expect(JSON.stringify(legacy)).not.toContain("hunter22");
  });
});

describe("describeError", () => {
  it("reports only the error name and Mongo code, never the message", () => {
    const duplicate = Object.assign(new Error('E11000 duplicate key { email: "grace@test.dev" }'), {
      name: "MongoServerError",
      code: 11000,
    });

    expect(describeError(duplicate)).toBe("MongoServerError (code 11000)");
    expect(describeError(new TypeError("secret detail"))).toBe("TypeError");
    expect(describeError("plain string")).toBe("Unknown error");
  });
});
