import { describe, expect, it } from "vitest";

import { AgeOptions } from "@/constants/AgeOptions";
import { CurrentYears } from "@/constants/CurrentYears";
import { DegreeLengths } from "@/constants/DegreeLengths";
import { DegreeTypes } from "@/constants/DegreeTypes";
import { Disciplines } from "@/constants/Disciplines";
import { HackathonCounts } from "@/constants/HackathonCounts";
import { LanguagesSpoken } from "@/constants/LanguagesSpoken";
import { SchoolingLevels } from "@/constants/SchoolingLevels";
import {
  AGE_VALUES,
  DEGREE_LENGTHS,
  DISCIPLINES,
  LANGUAGES_SPOKEN,
  SCHOOLING_LEVELS,
  currentYearValues,
  degreeTypeValues,
} from "@/lib/conuhacks/field-options";

const valuesOf = (options: readonly { value: string }[]) => options.map((option) => option.value);

describe("XI option labels (copied from the registration app's public/data)", () => {
  it("list every stored value exactly once, in the registration order", () => {
    expect(valuesOf(AgeOptions("en"))).toEqual([...AGE_VALUES]);
    expect(valuesOf(SchoolingLevels("en"))).toEqual([...SCHOOLING_LEVELS]);
    expect(valuesOf(DegreeLengths("en"))).toEqual([...DEGREE_LENGTHS]);
    expect(valuesOf(Disciplines("en"))).toEqual([...DISCIPLINES]);
    expect(valuesOf(LanguagesSpoken("en"))).toEqual([...LANGUAGES_SPOKEN]);
    expect(valuesOf(HackathonCounts("en"))).toEqual(["0", "1", "2", "3", "4", "5"]);
  });

  it("follow the level rules for current year and degree type", () => {
    for (const level of SCHOOLING_LEVELS) {
      expect(valuesOf(CurrentYears(level, "en"))).toEqual([...(currentYearValues(level) ?? [])]);
      expect(valuesOf(DegreeTypes(level, "en"))).toEqual([...degreeTypeValues(level)]);
    }
  });

  it("give reviewers readable English labels", () => {
    expect(AgeOptions("en")[0]).toEqual({ value: "under-18", label: "Under 18" });
    expect(Disciplines("en").find((option) => option.value === "computer-science")?.label).toBe("Computer Science");
    expect(HackathonCounts("en").at(-1)).toEqual({ value: "5", label: "5+" });
  });
});
