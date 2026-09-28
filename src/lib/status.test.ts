import { describe, expect, it } from "vitest";

import {
  APPLICATION_STATUSES,
  CHECKED_IN_STATUS,
  isCheckedInStatus,
  mergeCheckedInCounts,
  withLegacyCheckedIn,
} from "@/lib/status";
import Application from "@/repository/models/application";

describe("C4 checked-in status", () => {
  it("uses 'Checked-in' as the canonical value", () => {
    expect(CHECKED_IN_STATUS).toBe("Checked-in");
  });

  it("treats every historical spelling as checked in", () => {
    for (const value of ["Checked-in", "CheckedIn", "Checked-In", "checked-in"]) {
      expect(isCheckedInStatus(value)).toBe(true);
    }
    for (const value of ["Confirmed", "", null, undefined, 42]) {
      expect(isCheckedInStatus(value)).toBe(false);
    }
  });

  it("merges legacy counts into the canonical key without mutating input", () => {
    const input = { Confirmed: 3, CheckedIn: 2, "Checked-in": 5 };
    expect(mergeCheckedInCounts(input)).toEqual({ Confirmed: 3, "Checked-in": 7 });
    expect(input).toEqual({ Confirmed: 3, CheckedIn: 2, "Checked-in": 5 });
  });

  it("expands a checked-in status filter to both spellings without mutating input", () => {
    const input = ["Confirmed", "Checked-in"];
    expect(withLegacyCheckedIn(input)).toEqual(["Confirmed", "Checked-in", "CheckedIn"]);
    expect(withLegacyCheckedIn(["CheckedIn", "Checked-in"])).toEqual(["Checked-in", "CheckedIn"]);
    expect(withLegacyCheckedIn(["Submitted"])).toEqual(["Submitted"]);
    expect(input).toEqual(["Confirmed", "Checked-in"]);
  });

  it("keeps both values in the Applications model enum", () => {
    const enumValues = (Application.schema.path("status") as unknown as { enumValues: string[] }).enumValues;
    expect(enumValues).toEqual([...APPLICATION_STATUSES]);
    expect(enumValues).toContain("Checked-in");
    expect(enumValues).toContain("CheckedIn");
  });
});
