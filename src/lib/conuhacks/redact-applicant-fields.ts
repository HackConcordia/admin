/**
 * Strips the applicant fields the registry marks super-admin-only (`SUPER_ADMIN_ONLY_FIELD_KEYS`,
 * `application-fields.ts` — the same list `resolveSections` gates the view's fields on) before
 * data reaches a non-super admin's browser. Pure and client-safe: called both server-side, before
 * an API response or a server-component prop is ever serialized, and, being a small pure
 * function, safely importable anywhere `application-fields.ts` already is.
 *
 * Never hides sensitive data only in the UI: the caller must pass a DB-verified super-admin flag
 * (`fetchIsSuperAdmin`, never a JWT claim) and apply this before the data leaves the server.
 */
import { SUPER_ADMIN_ONLY_FIELD_KEYS } from "@/lib/conuhacks/application-fields";

/**
 * The admin-only travel decision. Only super admins decide travel (A2), so regular reviewers never
 * receive it. The applicant's own request (`travelReimbursement`) is not listed: reviewers see it.
 */
export const TRAVEL_DECISION_FIELD_KEYS = ["isTravelReimbursementApproved", "travelReimbursementAmount", "travelReimbursementCurrency"] as const;

export function redactSensitiveApplicantFields<T extends Record<string, unknown>>(details: T, isSuperAdmin: boolean): T {
  if (isSuperAdmin) return details;

  const redacted: Record<string, unknown> = { ...details };
  for (const key of SUPER_ADMIN_ONLY_FIELD_KEYS) {
    if (!(key in redacted)) continue;
    // Every registry-listed field is stored as a string (possibly null) or a string array
    // (application-fields.ts FIELD_STORAGE), so this keeps both the view's and a raw document's
    // types intact instead of deleting the key outright.
    redacted[key] = Array.isArray(redacted[key]) ? [] : "";
  }
  for (const key of TRAVEL_DECISION_FIELD_KEYS) delete redacted[key];
  return redacted as T;
}
