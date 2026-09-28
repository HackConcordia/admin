import { describe, expect, it } from "vitest";

import Volunteer from "@/repository/models/volunteer";

// event-checkin owns this collection (event-checkin/repository/models/volunteers.ts). Documents
// written here must look exactly like the ones event-checkin/scripts/create-volunteer.ts writes.
describe("Volunteer model (event-checkin compatibility)", () => {
  it("uses event-checkin's model name and collection", () => {
    expect(Volunteer.modelName).toBe("Volunteers");
    expect(Volunteer.collection.collectionName).toBe("volunteers");
  });

  it("declares exactly event-checkin's fields", () => {
    expect(Object.keys(Volunteer.schema.paths).sort()).toEqual([
      "_id",
      "email",
      "firstName",
      "isSuperAdmin",
      "lastName",
      "password",
    ]);
    expect(Volunteer.schema.path("isSuperAdmin").options.default).toBe(false);
  });

  it("never creates the collection, builds indexes or adds __v", () => {
    expect(Volunteer.schema.get("autoIndex")).toBe(false);
    expect(Volunteer.schema.get("autoCreate")).toBe(false);
    expect(Volunteer.schema.get("versionKey")).toBe(false);
  });
});
