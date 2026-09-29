import { describe, expect, it } from "vitest";

import { redactSensitiveStats } from "@/lib/conuhacks/stats-redaction";

const STATS = {
  totalApplicants: 3,
  tshirtCounts: { S: 1, M: 2, L: 0, XL: 0 },
  dietaryRestrictionsData: [{ restriction: "Vegan", count: 2 }],
};

describe("redactSensitiveStats", () => {
  it("zeroes T-shirt and dietary counts for a regular reviewer, keeping the categories", () => {
    expect(redactSensitiveStats(STATS, false)).toEqual({
      totalApplicants: 3,
      tshirtCounts: { S: 0, M: 0, L: 0, XL: 0 },
      dietaryRestrictionsData: [{ restriction: "Vegan", count: 0 }],
    });
  });

  it("returns the stats untouched for a super admin", () => {
    expect(redactSensitiveStats(STATS, true)).toBe(STATS);
  });
});
