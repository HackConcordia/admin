import { describe, expect, it } from "vitest";

import Settings from "@/repository/models/settings";

const DATE_FIELDS = ["registrationOpeningDate", "registrationClosingDate", "confirmationDate", "checkInOpeningDate", "checkInClosingDate"];

describe("Settings model", () => {
  it("declares the date fields and the capacity", () => {
    for (const field of DATE_FIELDS) expect(Settings.schema.path(field)).toBeDefined();
    expect(Settings.schema.path("maxCapacity").instance).toBe("Number");
  });

  it("accepts hand-written strings and Dates without a CastError", () => {
    const doc = new Settings({
      registrationOpeningDate: "2026-10-01T00:00:00-04:00",
      registrationClosingDate: "2027-01-20T23:59:00-05:00",
      confirmationDate: "Wednesday, January 20th 2027, 11:59 pm (EST)",
      checkInOpeningDate: new Date("2027-02-06T13:00:00.000Z"),
      checkInClosingDate: "2027-02-07T18:00:00.000Z",
      maxCapacity: 600,
    });

    expect(doc.validateSync()).toBeUndefined();
    expect(doc.get("registrationClosingDate")).toBe("2027-01-20T23:59:00-05:00");
    expect(doc.get("checkInOpeningDate")).toBeInstanceOf(Date);
    expect(doc.get("maxCapacity")).toBe(600);
  });
});
