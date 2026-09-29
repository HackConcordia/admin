import { describe, expect, it } from "vitest";

import { SETTINGS_DATE_FIELDS, toSettingsView } from "@/lib/settings/settings-view";

describe("toSettingsView", () => {
  it("exposes only the known fields, each date as stored plus display text", () => {
    const view = toSettingsView({
      _id: "x",
      __v: 0,
      secret: "no",
      registrationClosingDate: "2027-01-20T23:59:00-05:00",
      confirmationDate: new Date("2027-01-21T04:59:00.000Z"),
      checkInOpeningDate: "soon",
      maxCapacity: 600,
    });

    expect(Object.keys(view).sort()).toEqual(["dates", "maxCapacity"]);
    expect(Object.keys(view.dates)).toEqual([...SETTINGS_DATE_FIELDS]);
    expect(view.dates.registrationClosingDate.stored).toBe("2027-01-20T23:59:00-05:00");
    expect(view.dates.registrationClosingDate.display).toMatch(/January 20, 2027.*11:59\sPM.*EST/);
    expect(view.dates.confirmationDate.stored).toBe("2027-01-21T04:59:00.000Z");
    expect(view.dates.checkInOpeningDate).toEqual({ stored: "soon", display: "soon" });
    expect(view.dates.registrationOpeningDate).toEqual({ stored: null, display: null });
    expect(view.maxCapacity).toBe(600);
  });

  it("copes with a missing document and a non-numeric capacity", () => {
    expect(toSettingsView(null).maxCapacity).toBeNull();
    expect(toSettingsView({ maxCapacity: "lots" }).maxCapacity).toBeNull();
  });
});
