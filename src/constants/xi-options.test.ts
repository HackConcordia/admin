import { describe, expect, it } from "vitest";

import { CegepSchools } from "@/constants/CegepSchools";
import { CurrentYears } from "@/constants/CurrentYears";
import { DegreeLengths } from "@/constants/DegreeLengths";
import { DegreeTypes } from "@/constants/DegreeTypes";
import { Disciplines } from "@/constants/Disciplines";
import { HackathonCounts } from "@/constants/HackathonCounts";
import { LanguagesSpoken } from "@/constants/LanguagesSpoken";
import { SchoolingLevels } from "@/constants/SchoolingLevels";
import {
  DISCIPLINES,
  LANGUAGES_SPOKEN,
  SCHOOLING_LEVELS,
  currentYearValues,
  degreeLengthValues,
  degreeTypeValues,
} from "@/lib/conuhacks/field-options";

const valuesOf = (options: readonly { value: string }[]) => options.map((option) => option.value);
const labelOf = (options: readonly { value: string; label: string }[], value: string) =>
  options.find((option) => option.value === value)?.label;

describe("XI option labels (copied from the registration app's public/data)", () => {
  it("list every stored value exactly once, in the registration order", () => {
    expect(valuesOf(SchoolingLevels("en"))).toEqual([...SCHOOLING_LEVELS]);
    expect(valuesOf(Disciplines("en"))).toEqual([...DISCIPLINES]);
    expect(valuesOf(LanguagesSpoken("en"))).toEqual([...LANGUAGES_SPOKEN]);
    expect(valuesOf(HackathonCounts("en"))).toEqual(["0", "1", "2", "3", "4", "5"]);
    const cegeps = valuesOf(CegepSchools("en"));
    expect(new Set(cegeps).size).toBe(cegeps.length);
    expect(cegeps.at(-1)).toBe("other");
  });

  it("follow the level rules for current year, degree length and degree type", () => {
    for (const level of SCHOOLING_LEVELS) {
      expect(valuesOf(CurrentYears(level, "en"))).toEqual([...(currentYearValues(level) ?? [])]);
      expect(valuesOf(DegreeLengths(level, "en"))).toEqual([...degreeLengthValues(level)]);
      expect(valuesOf(DegreeTypes(level, "en"))).toEqual([...degreeTypeValues(level)]);
    }
  });

  it("give reviewers readable English labels", () => {
    expect(Disciplines("en").find((option) => option.value === "computer-science")?.label).toBe("Computer Science");
    expect(HackathonCounts("en").at(-1)).toEqual({ value: "5", label: "5+" });
    expect(labelOf(SchoolingLevels("en"), "High School")).toBe("High School");
    expect(labelOf(DegreeTypes("CEGEP", "en"), "DEC")).toBe("DEC (Diploma of College Studies)");
    expect(labelOf(DegreeTypes("CEGEP", "en"), "AEC")).toBe("AEC (Attestation of College Studies)");
  });

  it("keep the registration's French labels for the new high-school and CEGEP options", () => {
    expect(labelOf(SchoolingLevels("fr"), "High School")).toBe("École secondaire");
    expect(labelOf(CurrentYears("High School", "fr"), "Grade 10")).toBe("10e année (secondaire 4)");
    expect(labelOf(DegreeLengths("CEGEP", "fr"), "Other")).toBe("Autre");
    expect(labelOf(DegreeTypes("CEGEP", "fr"), "DEC")).toBe("DEC (diplôme d'études collégiales)");
    expect(labelOf(CegepSchools("fr"), "Marianopolis College")).toBe("Collège Marianopolis");
    expect(labelOf(CegepSchools("en"), "Marianopolis College")).toBe("Marianopolis College");
  });
});
