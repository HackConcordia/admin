import { describe, expect, it } from "vitest";

import User from "@/repository/models/user";

// The registration app writes null for the verification/reset tokens. A unique index over a
// field holding several nulls fails with a duplicate-key error, so the admin declares no unique
// token fields (same as admin-hackdecouverte).
describe("User model tokens", () => {
  it.each(["verificationToken", "resetPasswordToken"])("%s defaults to null and is not unique", (field) => {
    const options = User.schema.path(field).options;
    expect(options.default).toBeNull();
    expect(options.unique).toBeFalsy();
  });

  it("keeps email unique", () => {
    expect(User.schema.path("email").options.unique).toBe(true);
  });
});
