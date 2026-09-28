import { describe, expect, it } from "vitest";

import {
  BCRYPT_COST,
  DUMMY_BCRYPT_HASH,
  hashPassword,
  isBcryptHash,
  validateNewPassword,
  verifyPassword,
} from "@/lib/password";

describe("isBcryptHash", () => {
  it("recognises bcrypt prefixes only", () => {
    expect(isBcryptHash("$2b$12$abcdefghijklmnopqrstuv")).toBe(true);
    expect(isBcryptHash("$2a$10$abcdefghijklmnopqrstuv")).toBe(true);
    expect(isBcryptHash("hunter22")).toBe(false);
    expect(isBcryptHash(undefined)).toBe(false);
  });
});

describe("DUMMY_BCRYPT_HASH", () => {
  it("is a valid cost-12 bcrypt hash", () => {
    expect(isBcryptHash(DUMMY_BCRYPT_HASH)).toBe(true);
    expect(DUMMY_BCRYPT_HASH.split("$")[2]).toBe("12");
  });
});

describe("hashPassword / verifyPassword", () => {
  it("hashes with cost 12 by default", async () => {
    const hash = await hashPassword("correct horse");
    expect(BCRYPT_COST).toBe(12);
    expect(hash.startsWith("$2b$12$")).toBe(true);
  });

  it("verifies the right password and rejects the wrong one", async () => {
    const hash = await hashPassword("correct horse", 4);
    await expect(verifyPassword("correct horse", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong horse", hash)).resolves.toBe(false);
  });

  it("never accepts a plaintext stored value", async () => {
    await expect(verifyPassword("hunter22", "hunter22")).resolves.toBe(false);
  });

  it("rejects empty or non-string input", async () => {
    const hash = await hashPassword("correct horse", 4);
    await expect(verifyPassword("", hash)).resolves.toBe(false);
    await expect(verifyPassword({ $ne: null }, hash)).resolves.toBe(false);
    await expect(hashPassword("")).rejects.toThrow("Cannot hash an empty password");
  });
});

describe("validateNewPassword", () => {
  it("enforces presence, 8+ characters and the 72-byte bcrypt limit", () => {
    expect(validateNewPassword(undefined)).toBe("Password is required");
    expect(validateNewPassword("short")).toBe("Password must be at least 8 characters");
    expect(validateNewPassword("a".repeat(73))).toBe("Password must be at most 72 bytes");
    expect(validateNewPassword("long enough")).toBeNull();
  });
});
