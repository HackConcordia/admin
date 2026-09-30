import { describe, expect, it } from "vitest";
import {
  AGE_VALUES,
  DISCIPLINES,
  SCHOOLING_LEVELS,
  currentYearValues,
  degreeTypeValues,
  isOtherLevel,
  requiresDegreeDetails,
} from "./field-options";

describe("ConUHacks XI option values", () => {
  it("levels fit a university audience: no high school", () => {
    expect([...SCHOOLING_LEVELS]).toEqual(["CEGEP", "Undergraduate", "Graduate", "Recent graduate", "Other"]);
  });

  it("age keeps an explicit under-18 bucket for the consent-form rule", () => {
    expect(AGE_VALUES[0]).toBe("under-18");
    expect(AGE_VALUES).toContain("30+");
  });

  it("discipline has an 'other' escape hatch", () => {
    expect(DISCIPLINES).toContain("other");
    expect(DISCIPLINES).toContain("computer-science");
  });

  it.each(["CEGEP", "Undergraduate", "Graduate", "Recent graduate"])("%s asks for degree length/type and offers year choices", (level) => {
    expect(requiresDegreeDetails(level)).toBe(true);
    expect(currentYearValues(level)?.length).toBeGreaterThan(0);
    expect(degreeTypeValues(level)).toContain("Other");
  });

  it("'Other' (or no level) types the year freely and skips degree details", () => {
    for (const level of ["Other", "", undefined, "High School"]) {
      expect(currentYearValues(level)).toBeNull();
      expect(requiresDegreeDetails(level)).toBe(false);
      expect(degreeTypeValues(level)).toEqual([]);
    }
    expect(isOtherLevel("Other")).toBe(true);
  });

  it("recent graduates pick a 2026 graduation term (within a year of Feb 2027)", () => {
    expect(currentYearValues("Recent graduate")).toEqual(["Winter 2026", "Summer 2026", "Fall 2026"]);
  });
});
