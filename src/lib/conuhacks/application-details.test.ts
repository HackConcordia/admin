import { describe, expect, it } from "vitest";

import { toApplicationDetails } from "@/lib/conuhacks/application-details";

describe("toApplicationDetails", () => {
  it("keeps list fields in storage form, whatever shape was stored", () => {
    const details = toApplicationDetails({
      _id: "64c000000000000000000001",
      languagesSpoken: '["english"]',
      dietaryRestrictions: ['["vegan"]'],
      jobTypesInterested: undefined,
    });
    expect(details.languagesSpoken).toEqual(['["english"]']);
    expect(details.dietaryRestrictions).toEqual(['["vegan"]']);
    expect(details.jobTypesInterested).toEqual([]);
  });

  it("reads the MLH consents as strict booleans (missing means not given)", () => {
    expect(toApplicationDetails({ _id: "x", termsAndConditions: { mlhConduct: true, mlhEmails: false, mlhTerms: "yes" } })).toMatchObject({
      mlhConduct: true,
      mlhEmails: false,
      mlhTerms: false,
    });
    expect(toApplicationDetails({ _id: "x" })).toMatchObject({ mlhConduct: false, mlhEmails: false, mlhTerms: false });
  });

  it("keeps empty and plain-array list shapes", () => {
    const details = toApplicationDetails({
      _id: "x",
      languagesSpoken: ["[]"],
      dietaryRestrictions: ["english", "other"],
      jobTypesInterested: "",
    });
    expect(details.languagesSpoken).toEqual(["[]"]);
    expect(details.dietaryRestrictions).toEqual(["english", "other"]);
    expect(details.jobTypesInterested).toEqual([]);
  });

  it("keeps null for unanswered travel and hackathons and rejects wrong types", () => {
    const details = toApplicationDetails({ _id: "x", travelReimbursement: undefined, hackathons: "3" });
    expect(details.travelReimbursement).toBeNull();
    expect(details.hackathons).toBeNull();
    expect(toApplicationDetails({ _id: "x", travelReimbursement: null }).travelReimbursement).toBeNull();
    expect(toApplicationDetails({ _id: "x", travelReimbursement: false, hackathons: 0 })).toMatchObject({
      travelReimbursement: false,
      hackathons: 0,
    });
  });

  it("turns null links and nullable strings into '' and reports the resume", () => {
    const details = toApplicationDetails({ _id: "x", github: null, gender: null, resume: { id: "abc", size: 10 } });
    expect(details.github).toBe("");
    expect(details.gender).toBe("");
    expect(details.hasResume).toBe(true);
    expect(toApplicationDetails({ _id: "x", resume: { id: null } }).hasResume).toBe(false);
  });

  it("keeps the admin travel decision only with the right types", () => {
    expect(
      toApplicationDetails({ _id: "x", isTravelReimbursementApproved: true, travelReimbursementAmount: 150, travelReimbursementCurrency: "CAD" }),
    ).toMatchObject({ isTravelReimbursementApproved: true, travelReimbursementAmount: 150, travelReimbursementCurrency: "CAD" });
    expect(toApplicationDetails({ _id: "x", travelReimbursementAmount: "150" }).travelReimbursementAmount).toBeUndefined();
  });
});
