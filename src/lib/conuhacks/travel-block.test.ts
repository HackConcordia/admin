import { describe, expect, it } from "vitest";

import { describeTravelDecision, needsTravelDecision } from "@/lib/conuhacks/travel-block";

describe("needsTravelDecision (A2: only super admins decide travel)", () => {
  it("asks a super admin for a decision when the applicant asked", () => {
    expect(needsTravelDecision(true, true)).toBe(true);
  });
  it("never asks a regular admin, even when the applicant asked", () => {
    expect(needsTravelDecision(true, false)).toBe(false);
  });
  it("never asks for an applicant who said no or did not answer", () => {
    expect(needsTravelDecision(false, true)).toBe(false);
    expect(needsTravelDecision(null, true)).toBe(false);
    expect(needsTravelDecision(undefined, true)).toBe(false);
  });
});

describe("describeTravelDecision", () => {
  it("shows the approved amount and currency", () => {
    expect(describeTravelDecision({ isTravelReimbursementApproved: true, travelReimbursementAmount: 120, travelReimbursementCurrency: "CAD" })).toBe(
      "Approved: 120 CAD",
    );
  });
  it("shows Not approved when declined or undecided", () => {
    expect(describeTravelDecision({ isTravelReimbursementApproved: false })).toBe("Not approved");
    expect(describeTravelDecision({})).toBe("Not approved");
  });
  it("does not print undefined when an approval has no amount", () => {
    expect(describeTravelDecision({ isTravelReimbursementApproved: true })).toBe("Approved");
  });
});
