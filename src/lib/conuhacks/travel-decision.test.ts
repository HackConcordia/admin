import { describe, expect, it } from "vitest";

import { MAX_TRAVEL_AMOUNT, TRAVEL_AMOUNT_LIMITS, parseTravelDecision } from "@/lib/conuhacks/travel-decision";

describe("parseTravelDecision", () => {
  it("treats a missing decision as none", () => {
    expect(parseTravelDecision(undefined)).toEqual({ ok: true, decision: null });
    expect(parseTravelDecision(null)).toEqual({ ok: true, decision: null });
  });

  it("accepts an approval within the currency limit and a refusal", () => {
    expect(parseTravelDecision({ approved: true, amount: 150, currency: "CAD" })).toEqual({
      ok: true,
      decision: { approved: true, amount: 150, currency: "CAD" },
    });
    expect(parseTravelDecision({ approved: false, amount: 999 })).toEqual({ ok: true, decision: { approved: false } });
  });

  it.each([
    [{ approved: true, amount: 151, currency: "CAD" }],
    [{ approved: true, amount: 101, currency: "USD" }],
    [{ approved: true, amount: 0, currency: "CAD" }],
    [{ approved: true, amount: 10.5, currency: "CAD" }],
    [{ approved: true, amount: 50, currency: "EUR" }],
    [{ approved: "yes" }],
    [["approved"]],
  ])("rejects %j", (value) => {
    expect(parseTravelDecision(value).ok).toBe(false);
  });

  it("keeps ConUHacks X's limits in one place", () => {
    expect(TRAVEL_AMOUNT_LIMITS).toEqual({ CAD: 150, USD: 100 });
    expect(MAX_TRAVEL_AMOUNT).toBe(150);
  });
});
