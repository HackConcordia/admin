import { describe, expect, it } from "vitest";

import { buildSuperAdminDocument } from "@/lib/seed-admin";

const fakeHash = async (plain: string) => `$2b$12$hashed-${plain.length}`;

describe("buildSuperAdminDocument", () => {
  it("normalizes the email and stores only the hash", async () => {
    const doc = await buildSuperAdminDocument(
      { email: "  Organizer@HackConcordia.io ", firstName: " Ada ", lastName: "Lovelace", password: "long enough pass" },
      fakeHash,
    );
    expect(doc).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "organizer@hackconcordia.io",
      password: "$2b$12$hashed-16",
      isSuperAdmin: true,
      assignedApplications: [],
    });
  });

  it("rejects bad input with the env var name in the message", async () => {
    await expect(
      buildSuperAdminDocument({ email: "nope", firstName: "A", lastName: "B", password: "long enough" }, fakeHash),
    ).rejects.toThrow("SEED_ADMIN_EMAIL must be a valid email address");
    await expect(
      buildSuperAdminDocument({ email: "a@b.co", firstName: "", lastName: "B", password: "long enough" }, fakeHash),
    ).rejects.toThrow("SEED_ADMIN_FIRST_NAME and SEED_ADMIN_LAST_NAME are required");
    await expect(
      buildSuperAdminDocument({ email: "a@b.co", firstName: "A", lastName: "B", password: "short" }, fakeHash),
    ).rejects.toThrow("SEED_ADMIN_PASSWORD: Password must be at least 8 characters");
  });
});
