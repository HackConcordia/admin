import { describe, expect, it } from "vitest";

import { buildApplicationUpdate } from "@/lib/conuhacks/application-update";

const NAMES = { firstName: " Ada ", lastName: "Lovelace" };

function set(body: Record<string, unknown>, stored: Record<string, unknown> = {}) {
  const result = buildApplicationUpdate({ ...NAMES, ...body }, { stored });
  if (!result.ok) throw new Error(result.error);
  return result.set;
}

function error(body: Record<string, unknown>, stored: Record<string, unknown> = {}) {
  const result = buildApplicationUpdate({ ...NAMES, ...body }, { stored });
  return result.ok ? null : result.error;
}

describe("buildApplicationUpdate", () => {
  it("needs only the two names (no isEighteenOrAbove) and trims them", () => {
    expect(buildApplicationUpdate(NAMES)).toEqual({ ok: true, set: { firstName: "Ada", lastName: "Lovelace" } });
    expect(buildApplicationUpdate({ lastName: "L" })).toEqual({ ok: false, error: "Missing required field: firstName" });
    expect(buildApplicationUpdate("x")).toEqual({ ok: false, error: "Request body must be a JSON object" });
  });

  it("ignores email, ids, files and removed ConUHacks X fields", () => {
    expect(set({ email: "evil@x.dev", _id: "x", resume: {}, isEighteenOrAbove: "yes", faculty: "eng" })).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
    });
  });

  it("stores multi-selects the registration way, from any shape", () => {
    expect(set({ languagesSpoken: ["english", "french"] }).languagesSpoken).toEqual(['["english","french"]']);
    expect(set({ languagesSpoken: ['["english"]'] }).languagesSpoken).toEqual(['["english"]']);
    expect(set({ dietaryRestrictions: "[]" }).dietaryRestrictions).toEqual([]);
    expect(set({ dietaryRestrictions: ["[]"] }).dietaryRestrictions).toEqual([]);
    expect(set({ languagesSpoken: [] }).languagesSpoken).toEqual([]);
  });

  it("keeps null for an unanswered travel request and hackathon count, and reads a count choice", () => {
    expect(set({ travelReimbursement: null, hackathons: null })).toMatchObject({ travelReimbursement: null, hackathons: null });
    expect(set({ hackathons: "5" }).hackathons).toBe(5);
    expect(error({ hackathons: 6 })).toBe("hackathons must be a whole number from 0 to 5");
    expect(error({ travelReimbursement: "yes" })).toBe("travelReimbursement must be true, false or null");
  });

  it.each([
    [{ age: "17" }, "Invalid value for age"],
    [{ discipline: "astrology" }, "Invalid value for discipline"],
    [{ languagesSpoken: ["klingon"] }, "Invalid value for languagesSpoken"],
    [{ github: "javascript:alert(1)" }, "github must be an http(s) link"],
    [{ linkedin: "linkedin.com/in/ada" }, "linkedin must be an http(s) link"],
    [{ coolProject: "x".repeat(5001) }, "coolProject must be 5000 characters or fewer"],
    [{ phoneNumber: "1".repeat(5001) }, "phoneNumber must be 5000 characters or fewer"],
    [{ status: "Hacked" }, "Invalid status"],
  ])("rejects %j", (body, message) => {
    expect(error(body)).toBe(message);
  });

  it("accepts http(s) links, blank links and null", () => {
    expect(set({ github: " https://github.com/ada ", linkedin: "" })).toMatchObject({ github: "https://github.com/ada", linkedin: "" });
    expect(set({ github: null }).github).toBeNull();
  });

  it("keeps an unchanged off-list value so an unrelated edit can be saved", () => {
    expect(set({ city: "Atlantis" }, { city: "Atlantis" }).city).toBe("Atlantis");
    expect(error({ city: "Atlantis" }, { city: "Montreal" })).toBe("Invalid value for city");
  });

  it("checks current year and degree type against the effective level (body, else stored)", () => {
    expect(error({ currentYear: "Year 9" }, { currentLevelOfSchooling: "CEGEP" })).toBe("Invalid value for currentYear");
    expect(set({ currentYear: "Year 2" }, { currentLevelOfSchooling: "CEGEP" }).currentYear).toBe("Year 2");
    expect(set({ currentLevelOfSchooling: "Other", currentYear: "Bootcamp, week 3" }).currentYear).toBe("Bootcamp, week 3");
    expect(error({ currentLevelOfSchooling: "Graduate", degreeType: "AEC" })).toBe("Invalid value for degreeType");
  });

  it("clears hidden follow-ups with the registration rule", () => {
    expect(
      set({ isRegisteredForCoop: false, jobRolesLookingFor: "intern", jobTypesInterested: ["other"], jobTypesInterestedOther: "x" }),
    ).toMatchObject({ jobRolesLookingFor: "", jobTypesInterested: [], jobTypesInterestedOther: "" });
    expect(set({ currentLevelOfSchooling: "Other", degreeLength: "3 years", degreeType: "Other" })).toMatchObject({
      degreeLength: "",
      degreeType: "",
    });
    expect(set({ country: "US", city: "Montreal" }).city).toBe("");
  });

  it("canonicalizes checked-in and reads the reviewer fields", () => {
    expect(set({ status: "CheckedIn" }).status).toBe("Checked-in");
    expect(set({ comments: null, skillTags: [" react "] })).toMatchObject({ comments: "", skillTags: ["react"] });
    expect(error({ status: "Nope" })).toBe("Invalid status");
  });

  it("never writes the admin-only travel decision or server-owned fields", () => {
    expect(
      set({
        isTravelReimbursementApproved: true,
        travelReimbursementAmount: 150,
        travelReimbursementCurrency: "CAD",
        processedBy: "x@y.dev",
        isStarred: true,
      }),
    ).toEqual({ firstName: "Ada", lastName: "Lovelace" });
  });

  it("accepts an unchanged value before any length cap, and allows long free-text 'other' answers", () => {
    const long = "s".repeat(250);
    expect(set({ schoolOther: long }, { schoolOther: long, school: "other" }).schoolOther).toBe(long);
    expect(set({ school: "other", schoolOther: long }, { school: "other" }).schoolOther).toBe(long);
    const huge = "s".repeat(6000);
    expect(set({ coolProject: huge }, { coolProject: huge }).coolProject).toBe(huge);
    expect(error({ coolProject: huge }, { coolProject: "x" })).toBe("coolProject must be 5000 characters or fewer");
  });

  it("re-validates year and degree type against a NEW level even when they are unchanged", () => {
    const stored = { currentLevelOfSchooling: "Undergraduate", currentYear: "Year 5+", degreeType: "Bachelor's" };
    expect(error({ currentLevelOfSchooling: "CEGEP", currentYear: "Year 5+", degreeType: "Other" }, stored)).toBe(
      "Invalid value for currentYear",
    );
    expect(error({ currentLevelOfSchooling: "Graduate", currentYear: "PhD – year 3+", degreeType: "Bachelor's" }, stored)).toBe(
      "Invalid value for degreeType",
    );
    // level unchanged: an off-list stored year stays accepted
    expect(set({ currentLevelOfSchooling: "Undergraduate", currentYear: "Year 9" }, { ...stored, currentYear: "Year 9" }).currentYear).toBe("Year 9");
  });

  it("with an unknown level accepts only a listed year or degree type of some level, or free text for level Other", () => {
    expect(set({ currentYear: "Year 3" }).currentYear).toBe("Year 3");
    expect(error({ currentYear: "Year 42" })).toBe("Invalid value for currentYear");
    expect(set({ currentLevelOfSchooling: "Other", currentYear: "Bootcamp" }).currentYear).toBe("Bootcamp");
    expect(error({ currentLevelOfSchooling: "Other", currentYear: "x".repeat(201) })).toBe("currentYear must be 200 characters or fewer");
    expect(set({ degreeType: "PhD" }).degreeType).toBe("PhD");
    expect(error({ degreeType: "Wizard" })).toBe("Invalid value for degreeType");
    expect(() => buildApplicationUpdate({ ...NAMES, currentYear: "Year 1" }, { stored: { currentLevelOfSchooling: "" } })).not.toThrow();
  });

  it("copes with every stored list shape when comparing unchanged values", () => {
    expect(set({ languagesSpoken: ['["english","other"]'] }, { languagesSpoken: ["english", "other"] }).languagesSpoken).toEqual([
      '["english","other"]',
    ]);
    expect(set({ languagesSpoken: [] }, { languagesSpoken: ["[]"] }).languagesSpoken).toEqual([]);
    expect(set({ dietaryRestrictions: ['["none"]'] }, { dietaryRestrictions: ["none"] }).dietaryRestrictions).toEqual(['["none"]']);
    expect(set({ dietaryRestrictions: ['["legacy-diet"]'] }, { dietaryRestrictions: '["legacy-diet"]' }).dietaryRestrictions).toEqual([
      '["legacy-diet"]',
    ]);
  });

  it("keeps a stored null for the optional text answers when the save does not change it", () => {
    const result = set({ gender: "", pronouns: "", github: "", linkedin: "" }, { gender: null, pronouns: null, github: null, linkedin: null });
    expect(result).toMatchObject({ gender: null, pronouns: null, github: null, linkedin: null });
    expect(set({ gender: "" }, { gender: "woman" }).gender).toBe("");
  });
});
