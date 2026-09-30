import { describe, expect, it } from "vitest";

import {
  formatAge,
  formatCity,
  formatCountry,
  formatDietaryRestrictions,
  formatDiscipline,
  formatHackathons,
  formatLanguagesSpoken,
  formatLevel,
  formatList,
  formatSchool,
  formatTravelAnswer,
  optionLabel,
} from "@/lib/conuhacks/display";

describe("optionLabel", () => {
  it("returns the label of a listed value, the value itself when unlisted, '' when empty", () => {
    const options = [{ value: "computer-science", label: "Computer Science" }];
    expect(optionLabel(options, "computer-science")).toBe("Computer Science");
    expect(optionLabel(options, "astrology")).toBe("astrology");
    expect(optionLabel(options, "")).toBe("");
    expect(optionLabel(options, null)).toBe("");
  });
});

describe("formatList (every stored shape)", () => {
  const options = [
    { value: "english", label: "English" },
    { value: "french", label: "French" },
  ];
  it.each([
    [['["english","french"]'], "English | French"],
    ['["english"]', "English"],
    [["english", "french"], "English | French"],
    [["[]"], ""],
    [[], ""],
    [undefined, ""],
    [['["none"]'], ""],
  ])("%j gives %j", (value, expected) => {
    expect(formatList(value, options)).toBe(expected);
  });
});

describe("field formatters", () => {
  it("label codes and keep typed 'Other' answers", () => {
    expect(formatAge("under-18")).toBe("Under 18");
    expect(formatAge("30+")).toBe("30+");
    expect(formatCountry("CA")).toBe("Canada");
    expect(formatCity("Montreal")).toBe("Montreal, Quebec");
    expect(formatSchool("other", "École 42")).toBe("École 42");
    expect(formatSchool("Concordia University", "")).toBe("Concordia University");
    expect(formatLevel("Other", "Bootcamp")).toBe("Other (Bootcamp)");
    expect(formatLevel("Graduate", "")).toBe("University – graduate (master's or PhD)");
    expect(formatDiscipline("other", "Bioinformatics")).toBe("Other (Bioinformatics)");
    expect(formatDiscipline("data-science", "")).toBe("Data Science");
    expect(formatLanguagesSpoken(['["english","other"]'], "Arabic")).toBe("English | Other (Arabic)");
    expect(formatDietaryRestrictions(['["vegan","halal"]'])).toBe("Vegan | Halal");
    expect(formatDietaryRestrictions(['["none"]'])).toBe("None");
  });

  it("format hackathon counts, with 5 meaning 5 or more", () => {
    expect(formatHackathons(0)).toBe("0");
    expect(formatHackathons(5)).toBe("5+");
    expect(formatHackathons(null)).toBe("");
    expect(formatHackathons("3")).toBe("");
  });

  it("never reads an unanswered travel request as 'No'", () => {
    expect(formatTravelAnswer(true)).toBe("Yes");
    expect(formatTravelAnswer(false)).toBe("No");
    expect(formatTravelAnswer(null)).toBe("Not answered");
    expect(formatTravelAnswer(undefined)).toBe("Not answered");
  });

  it("reads empty and off-list stored dietary/language values without throwing", () => {
    expect(formatDietaryRestrictions(["[]"])).toBe("None");
    expect(formatDietaryRestrictions(undefined)).toBe("None");
    expect(formatDietaryRestrictions('["vegan"]')).toBe("Vegan");
    expect(formatLanguagesSpoken(undefined, "")).toBe("");
    expect(formatLanguagesSpoken(["[]"], "")).toBe("");
    expect(formatLanguagesSpoken(['["klingon"]'], "")).toBe("klingon");
  });
});
