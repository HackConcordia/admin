import { describe, expect, it } from "vitest";
import { parseSettingsDate } from "./parse-settings-date";

describe("parseSettingsDate", () => {
  it("reads a trailing (EST) label as UTC-5, whatever the server's own zone", () => {
    expect(parseSettingsDate("November 14th, 2026 (EST)")?.toISOString()).toBe("2026-11-14T05:00:00.000Z");
  });

  it("reads a trailing (EDT) label as UTC-4", () => {
    expect(parseSettingsDate("October 1st, 2026 (EDT)")?.toISOString()).toBe("2026-10-01T04:00:00.000Z");
  });

  it("honours the label when the string carries a time too", () => {
    expect(parseSettingsDate("November 14th, 2026 10:30 (EST)")?.toISOString()).toBe("2026-11-14T15:30:00.000Z");
  });

  it("still tolerates an unknown trailing label (dropped, as before)", () => {
    const date = parseSettingsDate("November 14th, 2026 (PST)");
    expect(date && [date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 10, 14]);
  });

  it("accepts a valid Date object unchanged, and rejects an invalid one", () => {
    const original = new Date("2026-10-01T04:00:00.000Z");
    expect(parseSettingsDate(original)?.getTime()).toBe(original.getTime());
    expect(parseSettingsDate(new Date("nope"))).toBeNull();
  });

  it("parses ISO strings", () => {
    expect(parseSettingsDate("2026-10-01T04:00:00.000Z")?.toISOString()).toBe("2026-10-01T04:00:00.000Z");
  });

  it("parses Date.prototype.toString() output (BSON Date cast to String by the admin app)", () => {
    const original = new Date(Date.UTC(2026, 9, 1, 8, 0, 0));
    const asString = original.toString();
    expect(parseSettingsDate(asString)?.getTime()).toBe(original.getTime());
  });

  it.each(["", "soon", null, undefined, 42])("returns null for %s", (value) => {
    expect(parseSettingsDate(value)).toBeNull();
  });
});
