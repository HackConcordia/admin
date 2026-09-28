import { randomBytes } from "node:crypto";

import { isBcryptHash } from "@/lib/password";

/**
 * 12 random bytes → 16 base64url characters (96 bits), the same strength as event-checkin's
 * generatePassword() (lib/volunteers/createVolunteerArgs.ts). Well above event-checkin's
 * 8-character login minimum and well below bcrypt's 72-byte limit.
 */
export const GENERATED_PASSWORD_BYTES = 12;

export function generateVolunteerPassword(): string {
  return randomBytes(GENERATED_PASSWORD_BYTES).toString("base64url");
}

/**
 * event-checkin only accepts bcrypt hashes at login (contract C6), so a volunteer whose stored
 * password is legacy plaintext, empty or missing can't sign in until an organizer resets it.
 */
export function needsPasswordReset(storedPassword: unknown): boolean {
  return !isBcryptHash(storedPassword);
}
