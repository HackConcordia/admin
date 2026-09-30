import { describe, expect, it } from "vitest";

import { computeAdvancedStats, redactSensitiveAdvancedStats } from "@/lib/conuhacks/advanced-stats";

const APPS = [
  {
    _id: "1", status: "Confirmed", age: "under-18", country: "CA", city: "Montreal", travelReimbursement: true,
    languagesSpoken: ['["english","french"]'], discipline: "computer-science", hackathons: 0, gender: "female",
    isRegisteredForCoop: true, jobTypesInterested: ['["data-analyst"]'], isStudentOrRecentGraduate: true,
    currentLevelOfSchooling: "Undergraduate", isTravelReimbursementApproved: true, travelReimbursementAmount: 100,
    travelReimbursementCurrency: "USD",
  },
  {
    _id: "2", status: "Checked-in", age: "22", country: "US", city: "", travelReimbursement: true, languagesSpoken: '["english"]',
    discipline: "other", disciplineOther: "Bio", hackathons: 5, isTravelReimbursementApproved: true,
    travelReimbursementAmount: 150, travelReimbursementCurrency: "CAD",
  },
  { _id: "3", status: "Submitted", age: "", country: "CA", city: "Toronto", travelReimbursement: null, languagesSpoken: ["[]"], hackathons: null },
  { _id: "4", status: "Admitted", country: "CA", city: "other-quebec", travelReimbursement: false },
];
const ADMINS = [{ firstName: "Grace", lastName: "Hopper", email: "g@x.dev", assignedApplications: ["3", "4"] }];

describe("computeAdvancedStats", () => {
  const stats = computeAdvancedStats(APPS, ADMINS);

  it("counts travel requests by Quebec residency and keeps 'not answered' apart", () => {
    expect(stats.travelReimbursement).toEqual({
      requested: 2, requestedOutsideQuebec: 1, requestedFromQuebec: 1, notRequested: 1, unanswered: 1,
    });
  });

  it("totals approved reimbursements in CAD for admitted and attending applicants", () => {
    expect(stats.overallTravelReimbursement).toBe(289);
    expect(stats.confirmedTravelReimbursement).toBe(289);
  });

  it("buckets attending applicants' ages, with under-18 on its own", () => {
    expect(stats.ageDistribution).toMatchObject({ underEighteen: 1, eighteenOrAbove: 1, notAnswered: 0 });
    expect(stats.ageDistribution.buckets[0]).toEqual({ name: "Under 18", count: 1 });
  });

  it("reads list answers in every stored shape, and hackathons in count order", () => {
    expect(stats.languagesSpokenDistribution).toEqual([{ name: "English", count: 2 }, { name: "French", count: 1 }]);
    expect(stats.hackathonsDistribution.map((entry) => entry.name)).toEqual(["0", "1", "2", "3", "4", "5+", "Not specified"]);
    expect(stats.hackathonsDistribution.find((entry) => entry.name === "5+")?.count).toBe(1);
    expect(stats.hackathonsDistribution.find((entry) => entry.name === "Not specified")?.count).toBe(2);
  });

  it("labels disciplines and counts each reviewer's workload", () => {
    expect(stats.disciplineDistribution).toEqual(
      expect.arrayContaining([{ name: "Computer Science", count: 1 }, { name: "Other", count: 1 }]),
    );
    expect(stats.adminAssignmentMetrics).toEqual([
      { adminName: "Grace Hopper", email: "g@x.dev", totalAssigned: 2, submittedAssigned: 1 },
    ]);
  });

  it("reads an empty list stored as [], a plain array, or [\"none\"]", () => {
    const shapes = computeAdvancedStats(
      [
        { _id: "a", status: "Submitted", languagesSpoken: [] },
        { _id: "b", status: "Submitted", languagesSpoken: ["english", "french"] },
        { _id: "c", status: "Submitted", languagesSpoken: ["none"] },
      ],
      [],
    );
    expect(shapes.languagesSpokenDistribution).toEqual([{ name: "English", count: 1 }, { name: "French", count: 1 }]);
  });
});

describe("redactSensitiveAdvancedStats", () => {
  it("hides the approved travel totals from a regular reviewer (A2) and keeps the requested counts", () => {
    const stats = computeAdvancedStats(APPS, ADMINS);
    const redacted = redactSensitiveAdvancedStats(stats, false);
    expect(redacted.overallTravelReimbursement).toBeNull();
    expect(redacted.confirmedTravelReimbursement).toBeNull();
    expect(redacted.travelReimbursement).toEqual(stats.travelReimbursement);
    expect(redactSensitiveAdvancedStats(stats, true).overallTravelReimbursement).toBe(289);
    expect(redactSensitiveAdvancedStats(stats, true).confirmedTravelReimbursement).toBe(289);
  });

  it("empties gender and age for a regular reviewer only", () => {
    const stats = computeAdvancedStats(APPS, ADMINS);
    const redacted = redactSensitiveAdvancedStats(stats, false);
    expect(redacted.sensitiveVisible).toBe(false);
    expect(redacted.genderDistribution).toEqual([]);
    expect(redacted.ageDistribution).toEqual({ eighteenOrAbove: 0, underEighteen: 0, notAnswered: 0, buckets: [] });
    expect(redacted.disciplineDistribution).toEqual(stats.disciplineDistribution);
    expect(redactSensitiveAdvancedStats(stats, true)).toBe(stats);
  });
});
