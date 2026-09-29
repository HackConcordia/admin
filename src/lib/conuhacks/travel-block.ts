/** Pure rules for the detail view's travel block. Client-safe. */

/**
 * Whether "Admit" should open the travel decision dialog. Travel approvals are at the super admins'
 * discretion (A2), so a regular admin never gets it and admits without a travel decision. `null`
 * (not answered) means the applicant didn't ask.
 */
export function needsTravelDecision(travelReimbursement: boolean | null | undefined, isSuperAdmin: boolean): boolean {
  return isSuperAdmin && travelReimbursement === true;
}

export interface TravelDecisionFields {
  isTravelReimbursementApproved?: boolean;
  travelReimbursementAmount?: number;
  travelReimbursementCurrency?: string;
}

export function describeTravelDecision(fields: TravelDecisionFields): string {
  if (fields.isTravelReimbursementApproved !== true) return "Not approved";
  const amount = [fields.travelReimbursementAmount, fields.travelReimbursementCurrency].filter((part) => part !== undefined && part !== "");
  return amount.length > 0 ? `Approved: ${amount.join(" ")}` : "Approved";
}
