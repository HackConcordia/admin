import type { IVolunteer } from "@/interfaces/IVolunteer";
import { needsPasswordReset } from "@/lib/volunteer-password";

/** The collation event-checkin's login lookup uses (lib/auth/verifyVolunteerCredentials.ts). */
export const CASE_INSENSITIVE_COLLATION = { locale: "en", strength: 2 } as const;

export const MAX_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NewVolunteerInput = { firstName: string; lastName: string; email: string };

export type ParseNewVolunteerResult = { ok: true; value: NewVolunteerInput } | { ok: false; error: string };

export type VolunteerRecord = {
  _id: unknown;
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  password?: unknown;
};

type FieldResult = { ok: true; value: string } | { ok: false; error: string };

/** event-checkin stores and looks up emails trimmed and lowercased (lib/volunteers/createVolunteerArgs.ts). */
export function normalizeVolunteerEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readName(value: unknown, label: string): FieldResult {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { ok: false, error: `${label} is required` };
  }

  const trimmed = value.trim();
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `${label} must be at most ${MAX_NAME_LENGTH} characters` };
  }

  return { ok: true, value: trimmed };
}

/**
 * Validates a create-volunteer request body. Only firstName, lastName and email are read; any
 * other field (password, isSuperAdmin, ...) is ignored, because passwords are always generated
 * server-side and super-admin status in event-checkin comes from its SUPER_ADMIN_EMAILS env var.
 * Non-string values (e.g. `{ "$ne": null }`) are rejected, so nothing reaches a Mongo query unchecked.
 */
export function parseNewVolunteer(body: unknown): ParseNewVolunteerResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const { firstName, lastName, email } = body as Record<string, unknown>;

  const first = readName(firstName, "First name");
  if (!first.ok) return first;

  const last = readName(lastName, "Last name");
  if (!last.ok) return last;

  if (typeof email !== "string" || email.trim().length === 0) {
    return { ok: false, error: "Email is required" };
  }

  const normalizedEmail = normalizeVolunteerEmail(email);
  if (normalizedEmail.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(normalizedEmail)) {
    return { ok: false, error: "Email is invalid" };
  }

  return { ok: true, value: { firstName: first.value, lastName: last.value, email: normalizedEmail } };
}

/** Maps a stored volunteer to the API shape. The stored password is read here and never leaves. */
export function toVolunteerListItem(record: VolunteerRecord): IVolunteer {
  return {
    _id: String(record._id),
    firstName: typeof record.firstName === "string" ? record.firstName : "",
    lastName: typeof record.lastName === "string" ? record.lastName : "",
    email: typeof record.email === "string" ? record.email : "",
    needsPasswordReset: needsPasswordReset(record.password),
  };
}

/**
 * A log-safe description of an error: its name and Mongo error code only. Messages are left out
 * because driver errors can echo document values.
 */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown error";

  const code = (error as { code?: unknown }).code;
  return code === undefined ? error.name : `${error.name} (code ${String(code)})`;
}
