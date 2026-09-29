import { describe, expect, it } from "vitest";

import { buildMealRecords, groupMealDays } from "@/lib/conuhacks/meals";

describe("buildMealRecords", () => {
  it("creates one untaken record per slot at UTC midnight, like event-checkin", () => {
    expect(buildMealRecords([{ date: "2026-11-28", type: "lunch" }])).toEqual([
      { date: new Date("2026-11-28T00:00:00.000Z"), type: "lunch", taken: false },
    ]);
  });
});

describe("groupMealDays", () => {
  it("groups slots into days in date order, meals in schedule order", () => {
    expect(
      groupMealDays([
        { date: "2026-11-29", type: "lunch" },
        { date: "2026-11-28", type: "snacks" },
        { date: "2026-11-28", type: "breakfast" },
      ]),
    ).toEqual([
      { date: "2026-11-28", label: "Saturday, November 28, 2026", types: ["breakfast", "snacks"] },
      { date: "2026-11-29", label: "Sunday, November 29, 2026", types: ["lunch"] },
    ]);
  });

  it("returns no days for an event without meals", () => {
    expect(groupMealDays([])).toEqual([]);
  });
});
