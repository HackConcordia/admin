import { describe, expect, it } from "vitest";
import { clearHiddenFields } from "./conditional-fields";

describe("clearHiddenFields", () => {
  it("unticking co-op clears every co-op question", () => {
    expect(
      clearHiddenFields({
        isRegisteredForCoop: false,
        jobRolesLookingFor: "intern",
        jobTypesInterested: '["other"]',
        jobTypesInterestedOther: "Robotics",
      }),
    ).toEqual({ isRegisteredForCoop: false, jobRolesLookingFor: "", jobTypesInterested: [], jobTypesInterestedOther: "" });
  });

  it("with co-op ticked, keeps the answers and clears only a stale 'other' text", () => {
    expect(
      clearHiddenFields({ isRegisteredForCoop: true, jobRolesLookingFor: "intern", jobTypesInterested: '["data-analyst"]', jobTypesInterestedOther: "x" }),
    ).toEqual({ isRegisteredForCoop: true, jobRolesLookingFor: "intern", jobTypesInterested: '["data-analyst"]', jobTypesInterestedOther: "" });
  });

  it("clears city outside Canada, schoolOther unless 'other', and the discipline/language/dietary 'other' texts", () => {
    expect(
      clearHiddenFields({
        country: "US",
        city: "Montreal",
        school: "McGill University",
        schoolOther: "x",
        discipline: "computer-science",
        disciplineOther: "x",
        languagesSpoken: '["english"]',
        languagesSpokenOther: "x",
        dietaryRestrictions: '["vegan"]',
        dietaryRestrictionsDescription: "x",
      }),
    ).toMatchObject({ city: "", schoolOther: "", disciplineOther: "", languagesSpokenOther: "", dietaryRestrictionsDescription: "" });
  });

  it("level 'Other' drops degree details; any other level drops the 'other level' text", () => {
    expect(clearHiddenFields({ currentLevelOfSchooling: "Other", otherLevelOfSchooling: "Bootcamp", degreeLength: "2 years", degreeType: "AEC" })).toEqual({
      currentLevelOfSchooling: "Other",
      otherLevelOfSchooling: "Bootcamp",
      degreeLength: "",
      degreeType: "",
    });
    expect(clearHiddenFields({ currentLevelOfSchooling: "CEGEP", otherLevelOfSchooling: "x", degreeLength: "2 years" })).toEqual({
      currentLevelOfSchooling: "CEGEP",
      otherLevelOfSchooling: "",
      degreeLength: "2 years",
    });
  });

  it("does nothing when the controlling answer isn't in the update, and never mutates its input", () => {
    const update = { firstName: "Ada", city: "Montreal" };
    expect(clearHiddenFields(update)).toEqual(update);
    expect(clearHiddenFields(update)).not.toBe(update);
  });

  describe("with the stored application as fallback", () => {
    it("a dependent answer is cleared when the stored controller hides it", () => {
      expect(clearHiddenFields({ jobRolesLookingFor: "intern", jobTypesInterested: ["data-analyst"] }, { isRegisteredForCoop: false })).toEqual({
        jobRolesLookingFor: "",
        jobTypesInterested: [],
        jobTypesInterestedOther: "",
      });
      expect(clearHiddenFields({ city: "Toronto" }, { country: "US" })).toEqual({ city: "" });
      expect(clearHiddenFields({ schoolOther: "x" }, { school: "McGill University" })).toEqual({ schoolOther: "" });
      expect(clearHiddenFields({ degreeType: "AEC" }, { currentLevelOfSchooling: "Other" })).toEqual({ degreeType: "", degreeLength: "" });
    });

    it("the body value wins over the stored one, and a visible controller keeps the answer", () => {
      expect(clearHiddenFields({ isRegisteredForCoop: true, jobRolesLookingFor: "intern" }, { isRegisteredForCoop: false })).toEqual({
        isRegisteredForCoop: true,
        jobRolesLookingFor: "intern",
      });
      expect(clearHiddenFields({ city: "Toronto" }, { country: "CA" })).toEqual({ city: "Toronto" });
      expect(clearHiddenFields({ country: "US", city: "Toronto" }, { country: "CA" })).toEqual({ country: "US", city: "" });
    });

    it("never touches fields the update neither sends nor controls", () => {
      expect(clearHiddenFields({ firstName: "Ada" }, { isRegisteredForCoop: false, country: "US" })).toEqual({ firstName: "Ada" });
    });
  });
});
