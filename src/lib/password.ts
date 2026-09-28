import bcrypt from "bcryptjs";

export const BCRYPT_COST = 12;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_BYTES = 72;

/** Contract C6: anything starting with "$2" is treated as an existing bcrypt hash. */
export function isBcryptHash(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("$2");
}

export async function hashPassword(plain: string, cost: number = BCRYPT_COST): Promise<string> {
  if (typeof plain !== "string" || plain.length === 0) {
    throw new Error("Cannot hash an empty password");
  }
  return bcrypt.hash(plain, cost);
}

/** Only bcrypt hashes can match. Unmigrated plaintext values always fail. */
export async function verifyPassword(plain: unknown, stored: unknown): Promise<boolean> {
  if (typeof plain !== "string" || plain.length === 0 || !isBcryptHash(stored)) {
    return false;
  }
  return bcrypt.compare(plain, stored);
}

export function validateNewPassword(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return "Password is required";
  }
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (new TextEncoder().encode(value).length > MAX_PASSWORD_BYTES) {
    return `Password must be at most ${MAX_PASSWORD_BYTES} bytes`;
  }
  return null;
}
