import { describe, expect, it } from "vitest";

import {
  APPLICANT_FIELD_KEYS,
  FIELD_STORAGE,
  SUPER_ADMIN_ONLY_FIELD_KEYS,
  TRAVEL_FIELD,
  UNANSWERED_CHOICE,
  displayFieldValue,
  parseChoice,
  resolveSections,
  type ApplicantFieldValues,
  type ResolvedField,
} from "@/lib/conuhacks/application-fields";

const keysOf = (values: ApplicantFieldValues, isSuperAdmin: boolean) =>
  resolveSections(values, { isSuperAdmin }).flatMap((section) => section.fields.map((field) => field.key));

const EVERYTHING: ApplicantFieldValues = {
  age: "19", phoneNumber: "5145550000", country: "CA", city: "Montreal", communicationLanguage: "french",
  languagesSpoken: ['["english","other"]'], languagesSpokenOther: "Arabic", isStudentOrRecentGraduate: true,
  currentLevelOfSchooling: "Other", otherLevelOfSchooling: "Bootcamp", school: "other", schoolOther: "École 42",
  currentYear: "Year 2", degreeLength: "3 years", degreeType: "Other", discipline: "other", disciplineOther: "Bio",
  hackathons: 2, coolProject: "A robot", excitedAbout: "Everything", isRegisteredForCoop: true,
  jobRolesLookingFor: "intern", jobTypesInterested: ['["other"]'], jobTypesInterestedOther: "Robotics",
  travelReimbursement: true, shirtSize: "M", dietaryRestrictions: ['["other"]'], dietaryRestrictionsDescription: "Sesame",
  gender: "female", pronouns: "she/her", underrepresented: "Yes", github: "https://github.com/ada", linkedin: "",
};

describe("field registry", () => {
  it("has a storage kind for every key, and no duplicate keys", () => {
    expect(new Set(APPLICANT_FIELD_KEYS).size).toBe(APPLICANT_FIELD_KEYS.length);
    for (const key of APPLICANT_FIELD_KEYS) expect(FIELD_STORAGE[key]).toBeDefined();
  });

  it("never gives a regular reviewer a super-admin-only field", () => {
    const shown = keysOf(EVERYTHING, false);
    for (const key of SUPER_ADMIN_ONLY_FIELD_KEYS) expect(shown).not.toContain(key);
  });

  it("gives super admins every applicant-answered field except links and travel (rendered separately)", () => {
    const shown = keysOf(EVERYTHING, true);
    const expected = APPLICANT_FIELD_KEYS.filter((key) => !["github", "linkedin", "travelReimbursement"].includes(key));
    expect([...shown].sort()).toEqual([...expected].sort());
    expect(shown).not.toContain(TRAVEL_FIELD.key);
  });

  it("shows follow-ups only when their trigger is picked or they already hold a value", () => {
    const base: ApplicantFieldValues = { country: "US", currentLevelOfSchooling: "Graduate", school: "Concordia University",
      discipline: "data-science", languagesSpoken: ['["english"]'], isRegisteredForCoop: false, jobTypesInterested: ['[]'] };
    const shown = keysOf(base, true);
    for (const hidden of ["city", "otherLevelOfSchooling", "schoolOther", "disciplineOther", "languagesSpokenOther",
      "jobRolesLookingFor", "jobTypesInterested", "jobTypesInterestedOther", "dietaryRestrictionsDescription"]) {
      expect(shown).not.toContain(hidden);
    }
    expect(shown).toEqual(expect.arrayContaining(["degreeLength", "degreeType"]));
    expect(keysOf({ ...base, currentLevelOfSchooling: "Other" }, true)).not.toContain("degreeType");
    expect(keysOf({ ...base, country: "CA" }, true)).toContain("city");
  });

  it("offers the current-year choices of the level, or free text for 'Other'", () => {
    const find = (values: ApplicantFieldValues) =>
      resolveSections(values, { isSuperAdmin: false }).flatMap((s) => s.fields).find((f) => f.key === "currentYear");
    expect(find({ currentLevelOfSchooling: "Graduate" })?.options?.map((o) => o.value)).toContain("PhD – year 3+");
    expect(find({ currentLevelOfSchooling: "Other" })).toMatchObject({ input: "text" });
  });

  it("resolves sections for every stored list shape and a missing field without throwing", () => {
    for (const list of [undefined, [], ["[]"], '["english"]', ["english", "other"], ['["none"]']]) {
      expect(() =>
        resolveSections({ languagesSpoken: list, jobTypesInterested: list, dietaryRestrictions: list }, { isSuperAdmin: true }),
      ).not.toThrow();
    }
    expect(keysOf({ languagesSpoken: ["english", "other"] }, true)).toContain("languagesSpokenOther");
  });
});

describe("displayFieldValue", () => {
  const spec = (key: ResolvedField["key"]) =>
    resolveSections(EVERYTHING, { isSuperAdmin: true }).flatMap((s) => s.fields).find((f) => f.key === key)!;

  it("shows labels, Yes/No, 5+ and list labels", () => {
    expect(displayFieldValue(spec("communicationLanguage"), "french")).toBe("French");
    expect(displayFieldValue(spec("isStudentOrRecentGraduate"), true)).toBe("Yes");
    expect(displayFieldValue(spec("hackathons"), 5)).toBe("5+");
    expect(displayFieldValue(spec("languagesSpoken"), ['["english","french"]'])).toBe("English | French");
    expect(displayFieldValue(spec("jobTypesInterested"), ["[]"])).toBe("");
    expect(displayFieldValue(TRAVEL_FIELD, null)).toBe("Not answered");
  });

  it("shows an empty list, a bare JSON string and a plain array without throwing", () => {
    expect(displayFieldValue(spec("languagesSpoken"), undefined)).toBe("");
    expect(displayFieldValue(spec("languagesSpoken"), '["english"]')).toBe("English");
    expect(displayFieldValue(spec("languagesSpoken"), ["english", "french"])).toBe("English | French");
  });

  it("shows an off-list stored select value as-is instead of hiding it", () => {
    expect(displayFieldValue(spec("city"), "Atlantis")).toBe("Atlantis");
    expect(displayFieldValue(spec("school"), "Lost School")).toBe("Lost School");
  });
});

describe("parseChoice", () => {
  it("maps select choices back to stored values", () => {
    expect(parseChoice("nullableBoolean", "true")).toBe(true);
    expect(parseChoice("nullableBoolean", "false")).toBe(false);
    expect(parseChoice("nullableBoolean", UNANSWERED_CHOICE)).toBeNull();
    expect(parseChoice("count", "3")).toBe(3);
    expect(parseChoice("count", UNANSWERED_CHOICE)).toBeNull();
  });
});
