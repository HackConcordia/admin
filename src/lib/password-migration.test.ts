import { describe, expect, it } from "vitest";

import { planPasswordMigration, type StoredAdmin } from "@/lib/password-migration";

const fakeHash = async (plain: string) => `$2b$12$fakehashof${plain.length}chars`;

const ADMINS: StoredAdmin[] = [
  { _id: "1", email: "plain@test.dev", password: "hunter22" },
  { _id: "2", email: "hashed@test.dev", password: "$2b$12$alreadyhashedvalue" },
  { _id: "3", email: "empty@test.dev", password: "" },
  { _id: "4", email: "missing@test.dev" },
];

describe("planPasswordMigration", () => {
  it("hashes only plaintext passwords and reports the rest", async () => {
    const plan = await planPasswordMigration(ADMINS, fakeHash);

    expect(plan.updates).toEqual([
      { _id: "1", email: "plain@test.dev", currentPassword: "hunter22", hashedPassword: "$2b$12$fakehashof8chars" },
    ]);
    expect(plan.alreadyHashed).toEqual(["hashed@test.dev"]);
    expect(plan.invalid).toEqual(["empty@test.dev", "missing@test.dev"]);
  });

  it("is idempotent: planning again after applying produces no updates", async () => {
    const first = await planPasswordMigration(ADMINS, fakeHash);
    const applied = ADMINS.map((admin) => {
      const update = first.updates.find((u) => u._id === admin._id);
      return update ? { ...admin, password: update.hashedPassword } : admin;
    });

    const second = await planPasswordMigration(applied, fakeHash);
    expect(second.updates).toEqual([]);
    expect(second.alreadyHashed).toEqual(["plain@test.dev", "hashed@test.dev"]);
  });

  it("falls back to the id when an admin has no email", async () => {
    const plan = await planPasswordMigration([{ _id: "abc", password: "hunter22" }], fakeHash);
    expect(plan.updates[0].email).toBe("abc");
  });
});
