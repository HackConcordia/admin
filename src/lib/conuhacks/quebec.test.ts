import { describe, expect, it } from "vitest";

import { Cities } from "@/constants/Cities";
import { QUEBEC_CITIES, isQuebecResident } from "@/lib/conuhacks/quebec";

describe("QUEBEC_CITIES", () => {
  it("is every city whose label ends with ', Quebec' (the registration app's own rule)", () => {
    const expected = Cities("en")
      .filter((city) => city.label.endsWith(", Quebec"))
      .map((city) => city.value);
    expect(QUEBEC_CITIES).toEqual(expected);
    expect(QUEBEC_CITIES.length).toBeGreaterThanOrEqual(21);
  });

  it("includes Montreal and the catch-all other-quebec, but not other-canada", () => {
    expect(QUEBEC_CITIES).toContain("Montreal");
    expect(QUEBEC_CITIES).toContain("other-quebec");
    expect(QUEBEC_CITIES).not.toContain("other-canada");
  });
});

describe("isQuebecResident", () => {
  it.each([
    ["CA", "Montreal", true],
    ["CA", "other-quebec", true],
    ["CA", "other-canada", false],
    ["US", "Montreal", false],
    ["CA", "", false],
    [undefined, undefined, false],
    ["CA", ["Montreal"], false],
  ])("country %j, city %j gives %s", (country, city, expected) => {
    expect(isQuebecResident(country, city)).toBe(expected);
  });
});
