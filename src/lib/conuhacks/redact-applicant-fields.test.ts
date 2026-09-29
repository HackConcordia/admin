import { describe, expect, it } from "vitest";

import { SUPER_ADMIN_ONLY_FIELD_KEYS } from "@/lib/conuhacks/application-fields";
import { redactSensitiveApplicantFields } from "@/lib/conuhacks/redact-applicant-fields";

const DOC = {
  _id: "64c000000000000000000001",
  firstName: "Ada",
  discipline: "computer-science",
  age: "under-18",
  phoneNumber: "5145550000",
  shirtSize: "M",
  dietaryRestrictions: ['["vegan"]'],
  dietaryRestrictionsDescription: "No sesame",
  gender: "female",
  pronouns: "she/her",
  underrepresented: "Yes",
};

describe("redactSensitiveApplicantFields", () => {
  it("covers exactly the Q2 list", () => {
    expect([...SUPER_ADMIN_ONLY_FIELD_KEYS].sort()).toEqual(
      ["age", "dietaryRestrictions", "dietaryRestrictionsDescription", "gender", "phoneNumber", "pronouns", "shirtSize", "underrepresented"],
    );
  });

  it("blanks every super-admin-only field for a regular reviewer and keeps the rest", () => {
    const redacted = redactSensitiveApplicantFields(DOC, false);
    expect(redacted).toMatchObject({ firstName: "Ada", discipline: "computer-science" });
    expect(redacted.dietaryRestrictions).toEqual([]);
    for (const value of ["under-18", "5145550000", "No sesame", "female", "she/her", "vegan"]) {
      expect(JSON.stringify(redacted)).not.toContain(value);
    }
    expect(DOC.gender).toBe("female");
  });

  it("returns the document untouched for a super admin", () => {
    expect(redactSensitiveApplicantFields(DOC, true)).toBe(DOC);
  });
});
