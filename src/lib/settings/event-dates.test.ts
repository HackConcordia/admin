import { describe, expect, it } from "vitest";

import { formatSettingsDate } from "@/lib/settings/event-dates";

describe("formatSettingsDate", () => {
  it("shows Montreal time with the zone, whatever the server's own zone", () => {
    expect(formatSettingsDate("2027-01-21T04:59:00.000Z")).toMatch(/Wednesday, January 20, 2027.*11:59\sPM.*EST/);
    expect(formatSettingsDate("2026-10-01T04:00:00.000Z")).toMatch(/Thursday, October 1, 2026.*12:00\sAM.*EDT/);
  });

  it("reads a hand-written ISO string with a Montreal offset exactly", () => {
    expect(formatSettingsDate("2027-01-20T23:59:00-05:00")).toMatch(/Wednesday, January 20, 2027.*11:59\sPM.*EST/);
  });

  it("formats a Date value", () => {
    expect(formatSettingsDate(new Date("2027-01-21T04:59:00.000Z"))).toMatch(/January 20, 2027/);
    expect(formatSettingsDate(new Date("nope"))).toBeNull();
  });

  it("shows unparseable text as stored, and nothing for empty values", () => {
    expect(formatSettingsDate("  End of October  ")).toBe("End of October");
    expect(formatSettingsDate("")).toBeNull();
    expect(formatSettingsDate(undefined)).toBeNull();
    expect(formatSettingsDate(42)).toBeNull();
  });
});
