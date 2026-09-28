import { describe, expect, it } from "vitest";

import { validateNewPassword } from "@/lib/password";
import { GENERATED_PASSWORD_BYTES, generateVolunteerPassword, needsPasswordReset } from "@/lib/volunteer-password";

describe("generateVolunteerPassword", () => {
  it("returns 16 url-safe characters from 12 random bytes, like event-checkin's generatePassword()", () => {
    expect(GENERATED_PASSWORD_BYTES).toBe(12);
    expect(generateVolunteerPassword()).toMatch(/^[A-Za-z0-9_-]{16}$/);
  });

  it("returns a different password on every call", () => {
    const passwords = new Set(Array.from({ length: 50 }, () => generateVolunteerPassword()));
    expect(passwords.size).toBe(50);
  });

  it("satisfies the admin password rules (8+ characters, at most 72 bytes)", () => {
    expect(validateNewPassword(generateVolunteerPassword())).toBeNull();
  });
});

describe("needsPasswordReset", () => {
  it("is false for a bcrypt hash", () => {
    expect(needsPasswordReset("$2b$12$abcdefghijklmnopqrstuv")).toBe(false);
    expect(needsPasswordReset("$2a$10$abcdefghijklmnopqrstuv")).toBe(false);
  });

  it("is true for legacy plaintext, empty, missing or non-string values", () => {
    expect(needsPasswordReset("hunter22")).toBe(true);
    expect(needsPasswordReset("")).toBe(true);
    expect(needsPasswordReset(undefined)).toBe(true);
    expect(needsPasswordReset(null)).toBe(true);
    expect(needsPasswordReset(12345678)).toBe(true);
  });
});
