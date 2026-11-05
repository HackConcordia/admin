import { describe, expect, it } from "vitest";
import {
  DISCIPLINES,
  SCHOOLING_LEVELS,
  currentYearValues,
  degreeLengthValues,
  degreeTypeValues,
  isOtherLevel,
  requiresDegreeDetails,
} from "./field-options";

describe("ConUHacks XI option values", () => {
  it("levels run from high school to graduate studies, high school first", () => {
    expect([...SCHOOLING_LEVELS]).toEqual(["High School", "CEGEP", "Undergraduate", "Graduate", "Recent graduate", "Other"]);
  });

  it("discipline has an 'other' escape hatch", () => {
    expect(DISCIPLINES).toContain("other");
    expect(DISCIPLINES).toContain("computer-science");
  });

  it.each(["CEGEP", "Undergraduate", "Graduate", "Recent graduate"])("%s asks for degree length/type and offers year choices", (level) => {
    expect(requiresDegreeDetails(level)).toBe(true);
    expect(currentYearValues(level)?.length).toBeGreaterThan(0);
    expect(degreeLengthValues(level)).toContain("1 year");
    expect(degreeTypeValues(level)).toContain("Other");
  });

  it("high school picks a grade (7 to 12) and skips degree details", () => {
    expect(currentYearValues("High School")).toEqual(["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"]);
    expect(requiresDegreeDetails("High School")).toBe(false);
    expect(degreeLengthValues("High School")).toEqual([]);
    expect(degreeTypeValues("High School")).toEqual([]);
  });

  it("CEGEP offers HackDécouverte's years, lengths and types", () => {
    expect(currentYearValues("CEGEP")).toEqual(["Year 1", "Year 2", "Year 3", "Year 4+"]);
    expect(degreeLengthValues("CEGEP")).toEqual(["1 year", "2 years", "3 years", "Other"]);
    expect(degreeTypeValues("CEGEP")).toEqual(["DEC", "AEC", "Certificate", "Technical", "Other"]);
  });

  it.each(["Undergraduate", "Graduate", "Recent graduate"])("%s keeps the university degree lengths", (level) => {
    expect(degreeLengthValues(level)).toEqual(["1 year", "2 years", "3 years", "4 years", "5+ years"]);
  });

  it("'Other' (or no level) types the year freely and skips degree details", () => {
    for (const level of ["Other", "", undefined, "Middle school"]) {
      expect(currentYearValues(level)).toBeNull();
      expect(requiresDegreeDetails(level)).toBe(false);
      expect(degreeLengthValues(level)).toEqual([]);
      expect(degreeTypeValues(level)).toEqual([]);
    }
    expect(isOtherLevel("Other")).toBe(true);
  });

  it("recent graduates pick a 2026 graduation term (within a year of Feb 2027)", () => {
    expect(currentYearValues("Recent graduate")).toEqual(["Winter 2026", "Summer 2026", "Fall 2026"]);
  });
});
