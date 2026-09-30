import { describe, expect, it } from "vitest";

import {
  AGE_VALUES,
  COMMUNICATION_LANGUAGES,
  DISCIPLINES,
  MAX_HACKATHON_COUNT,
  SCHOOLING_LEVELS,
} from "@/lib/conuhacks/field-options";
import Application from "@/repository/models/application";

// The registration app owns this collection: registration-website-conuhacks-10/my-app/lib/models/applicationSchema.ts
const REGISTRATION_FIELDS = [
  "firstName", "lastName", "age", "phoneNumber", "email", "status", "processedBy", "processedAt", "teamId",
  "country", "city", "communicationLanguage", "languagesSpoken", "languagesSpokenOther", "isStudentOrRecentGraduate",
  "currentLevelOfSchooling", "otherLevelOfSchooling", "school", "schoolOther", "currentYear", "degreeLength",
  "degreeType", "discipline", "disciplineOther", "hackathons", "coolProject", "excitedAbout", "travelReimbursement",
  "shirtSize", "dietaryRestrictions", "dietaryRestrictionsDescription", "resume", "github", "linkedin", "gender",
  "pronouns", "underrepresented", "isRegisteredForCoop", "jobRolesLookingFor", "jobTypesInterested",
  "jobTypesInterestedOther", "termsAndConditions",
];
const ADMIN_ONLY_FIELDS = [
  "comments", "skillTags", "isStarred", "isTravelReimbursementApproved", "travelReimbursementAmount",
  "travelReimbursementCurrency", "checkedInAt",
];
const REMOVED_X_FIELDS = [
  "isEighteenOrAbove", "faculty", "facultyOther", "levelOfStudy", "levelOfStudyOther", "program", "programOther",
  "graduationSemester", "graduationYear", "preferredLanguage", "workingLanguages", "workingLanguagesOther",
  "workRegions", "workRegionsOther", "nextCoopTerm", "nextCoopTermOther",
];

describe("Application model (ConUHacks XI registration compatibility)", () => {
  const paths = Object.keys(Application.schema.paths);

  it("uses the registration app's model name and collection", () => {
    expect(Application.modelName).toBe("Applications");
    expect(Application.collection.collectionName).toBe("applications");
  });

  it("declares every XI registration field and the admin review fields", () => {
    expect(paths).toEqual(expect.arrayContaining([...REGISTRATION_FIELDS, ...ADMIN_ONLY_FIELDS]));
  });

  it("declares no removed ConUHacks X field, and requires nothing but the email", () => {
    for (const field of REMOVED_X_FIELDS) expect(paths).not.toContain(field);
    expect(paths.filter((path) => Application.schema.path(path).isRequired)).toEqual(["email"]);
  });

  it("mirrors the registration enums", () => {
    expect(Application.schema.path("age").options.enum).toEqual(["", ...AGE_VALUES]);
    expect(Application.schema.path("communicationLanguage").options.enum).toEqual(["", ...COMMUNICATION_LANGUAGES]);
    expect(Application.schema.path("currentLevelOfSchooling").options.enum).toEqual(["", ...SCHOOLING_LEVELS]);
    expect(Application.schema.path("discipline").options.enum).toEqual(["", ...DISCIPLINES]);
    expect(Application.schema.path("status").options.enum).toEqual([
      "Unverified", "Incomplete", "Submitted", "Admitted", "Waitlisted", "Confirmed", "Declined",
      "Checked-in", "CheckedIn", "Refused",
    ]);
  });

  it("keeps null for unanswered travel and hackathons, and lists as string arrays", () => {
    expect(Application.schema.path("travelReimbursement").options.default).toBeNull();
    expect(Application.schema.path("hackathons").options.default).toBeNull();
    expect(Application.schema.path("hackathons").options.max).toBe(MAX_HACKATHON_COUNT);
    for (const list of ["languagesSpoken", "dietaryRestrictions", "jobTypesInterested"]) {
      expect(Application.schema.path(list).instance).toBe("Array");
    }
  });

  it("never builds indexes or creates the collection (the registration app owns them)", () => {
    expect(Application.schema.get("autoIndex")).toBe(false);
    expect(Application.schema.get("autoCreate")).toBe(false);
  });
});
