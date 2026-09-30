/**
 * The admin's travel reimbursement decision shape and limits. The registration app never declares,
 * reads or accepts these fields. Client-safe: the decision dialog shares the limits.
 *
 * This module only validates the shape of a decision. WHO may submit one (super admins only, decided
 * from the database) is enforced by the status route, not here.
 */
export const TRAVEL_CURRENCIES = ["CAD", "USD"] as const;
export type TravelCurrency = (typeof TRAVEL_CURRENCIES)[number];

/** Per-person maximum (ConUHacks X: $150 CAD / $100 USD). Change here once ECA confirms XI's amounts. */
export const TRAVEL_AMOUNT_LIMITS: Readonly<Record<TravelCurrency, number>> = { CAD: 150, USD: 100 };
export const MAX_TRAVEL_AMOUNT = Math.max(...Object.values(TRAVEL_AMOUNT_LIMITS));

export const isTravelCurrency = (value: unknown): value is TravelCurrency =>
  typeof value === "string" && (TRAVEL_CURRENCIES as readonly string[]).includes(value);

export type TravelDecision = { approved: true; amount: number; currency: TravelCurrency } | { approved: false };
export type TravelDecisionResult = { ok: true; decision: TravelDecision | null } | { ok: false; error: string };

const INVALID = "Invalid travel reimbursement decision";

export function parseTravelDecision(value: unknown): TravelDecisionResult {
  if (value === undefined || value === null) return { ok: true, decision: null };
  if (typeof value !== "object" || Array.isArray(value)) return { ok: false, error: INVALID };
  const { approved, amount, currency } = value as Record<string, unknown>;
  if (approved === false) return { ok: true, decision: { approved: false } };
  if (approved !== true) return { ok: false, error: INVALID };
  if (!isTravelCurrency(currency)) return { ok: false, error: "Travel reimbursement currency must be CAD or USD" };
  const limit = TRAVEL_AMOUNT_LIMITS[currency];
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 1 || amount > limit) {
    return { ok: false, error: `Travel reimbursement amount must be a whole number from 1 to ${limit} ${currency}` };
  }
  return { ok: true, decision: { approved: true, amount, currency } };
}
