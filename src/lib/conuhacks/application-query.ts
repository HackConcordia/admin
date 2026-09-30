/** The Applications list query. Every filter is its own clause joined with $and, so none overwrites another. */
import { QUEBEC_CITIES } from "@/lib/conuhacks/quebec";
import { withLegacyCheckedIn } from "@/lib/status";

export const TRAVEL_FILTER_VALUES = ["true", "outside-quebec", "quebec", "false", "unanswered", "approved", "starred"] as const;

export function travelFilterClause(filter: string): Record<string, unknown> | null {
  const quebecCities = [...QUEBEC_CITIES];
  switch (filter) {
    case "true":
      return { travelReimbursement: true };
    case "outside-quebec":
      return { travelReimbursement: true, $or: [{ country: { $ne: "CA" } }, { country: "CA", city: { $nin: quebecCities } }] };
    case "quebec":
      return { travelReimbursement: true, country: "CA", city: { $in: quebecCities } };
    case "false":
      return { travelReimbursement: false };
    case "unanswered":
      // Matches null and a missing field.
      return { travelReimbursement: null };
    case "approved":
      return { isTravelReimbursementApproved: true };
    case "starred":
      return { isStarred: true };
    default:
      return null;
  }
}

export const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface ApplicationsQueryInput {
  search?: string;
  status?: string;
  travelReimbursement?: string;
  assignedStatus?: string;
  assignedIds?: readonly string[];
  assignedTo?: string;
  /** Decided by the caller from the database. Travel decisions are super-admin-only (A2). */
  isSuperAdmin?: boolean;
}

export function buildApplicationsQuery(input: ApplicationsQueryInput): Record<string, unknown> {
  const clauses: Record<string, unknown>[] = [];

  const search = input.search?.trim();
  if (search) {
    const pattern = escapeRegex(search);
    clauses.push({
      $or: [
        { email: { $regex: pattern, $options: "i" } },
        { $expr: { $regexMatch: { input: { $concat: ["$firstName", " ", "$lastName"] }, regex: pattern, options: "i" } } },
      ],
    });
  }

  // C4: "Checked-in" also matches documents stored with the legacy "CheckedIn".
  const statuses = withLegacyCheckedIn((input.status ?? "").split(",").filter(Boolean));
  if (statuses.length === 1) clauses.push({ status: statuses[0] });
  if (statuses.length > 1) clauses.push({ status: { $in: statuses } });

  // The approved filter would reveal a super admin's travel decisions to a reviewer by set membership.
  const travelFilter = input.travelReimbursement === "approved" && input.isSuperAdmin !== true ? "" : input.travelReimbursement;
  const travel = travelFilter ? travelFilterClause(travelFilter) : null;
  if (travel) clauses.push(travel);

  if (input.assignedStatus === "assigned") clauses.push({ processedBy: { $ne: "Not processed" } });
  if (input.assignedStatus === "not-assigned") clauses.push({ processedBy: "Not processed" });

  const reviewers = (input.assignedTo ?? "").split(",").filter(Boolean);
  if (reviewers.length > 0) clauses.push({ processedBy: { $in: reviewers } });

  if (input.assignedIds !== undefined) clauses.push({ _id: { $in: [...input.assignedIds] } });

  if (clauses.length === 0) return {};
  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}
