import type { NextRequest } from "next/server";

import { parseTravelDecision, type TravelDecision } from "@/lib/conuhacks/travel-decision";
import { fetchIsSuperAdmin, requireAdmin } from "@/lib/require-admin";
import Application from "@/repository/models/application";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import { sendAdmittedEmail, sendRefusedEmail, sendWaitlistedEmail } from "@/utils/admissionEmailConfig";

const ACTIONS = { admit: "Admitted", waitlist: "Waitlisted", reject: "Refused" } as const;
type Action = keyof typeof ACTIONS;

const OBJECT_ID_HEX = /^[0-9a-fA-F]{24}$/;

/** The statuses a decision may start from (never Unverified, Incomplete, Confirmed, checked in, …). */
const DECIDABLE_STATUSES = ["Submitted", "Admitted", "Waitlisted", "Refused"];

/** Body keys that carry a travel decision (approve, decline, amount, currency). Super admins only (A2). */
const TRAVEL_DECISION_KEYS = ["travelReimbursement", "isTravelReimbursementApproved", "travelReimbursementAmount", "travelReimbursementCurrency"];

type Applicant = { email?: unknown; firstName?: unknown; lastName?: unknown; status?: unknown; travelReimbursement?: unknown };

// Name and Mongo code only: error messages can carry applicant data.
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error";
  const code = (error as { code?: unknown }).code;
  return code === undefined ? error.name : `${error.name} (code ${String(code)})`;
}

const carriesTravelDecision = (input: Record<string, unknown>): boolean =>
  TRAVEL_DECISION_KEYS.some((key) => input[key] !== undefined && input[key] !== null);

/** The admin-only travel fields a decision writes. Never read or accepted by the registration app. */
function travelUpdate(decision: TravelDecision | null): { set: Record<string, unknown>; unset?: Record<string, ""> } {
  if (!decision) return { set: {} };
  if (!decision.approved) {
    return { set: { isTravelReimbursementApproved: false }, unset: { travelReimbursementAmount: "", travelReimbursementCurrency: "" } };
  }
  return {
    set: { isTravelReimbursementApproved: true, travelReimbursementAmount: decision.amount, travelReimbursementCurrency: decision.currency },
  };
}

function sendDecisionEmail(action: Action, applicant: Applicant, decision: TravelDecision | null): Promise<boolean> {
  const email = String(applicant.email ?? "");
  const firstName = String(applicant.firstName ?? "");
  const lastName = String(applicant.lastName ?? "");
  if (action === "admit") return sendAdmittedEmail(email, firstName, lastName, decision ?? undefined);
  if (action === "waitlist") return sendWaitlistedEmail(email, firstName, lastName);
  return sendRefusedEmail(email, firstName, lastName);
}

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ applicationId: string }> }) => {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { applicationId } = await params;
    if (!OBJECT_ID_HEX.test(applicationId)) return sendErrorResponse("Invalid application id", null, 400);

    const body: unknown = await req.json().catch(() => null);
    const input = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

    // A2: travel reimbursement is at the super admins' discretion. Decided from the database, never
    // the JWT claim, and before any read or write. A regular admin may still admit without a decision.
    if (carriesTravelDecision(input) && (await fetchIsSuperAdmin(auth.admin.adminId)) !== true) {
      return sendErrorResponse("Only super admins can decide travel reimbursement", null, 403);
    }

    const action = input.action;
    if (typeof action !== "string" || !Object.hasOwn(ACTIONS, action)) return sendErrorResponse("Invalid action", null, 400);

    // Only an admission carries a travel decision. It is validated before any database access.
    const travel = action === "admit" ? parseTravelDecision(input.travelReimbursement) : ({ ok: true, decision: null } as const);
    if (!travel.ok) return sendErrorResponse(travel.error, null, 400);

    await connectMongoDB();
    const application = (await Application.findById(applicationId)) as Applicant | null;
    if (!application) return sendErrorResponse("Application not found", null, 404);

    const readStatus = application.status;
    if (typeof readStatus !== "string" || !DECIDABLE_STATUSES.includes(readStatus)) {
      return sendErrorResponse(`A decision can't be made on an application that is ${String(readStatus ?? "unknown")}`, null, 409);
    }
    if (travel.decision && application.travelReimbursement !== true) {
      return sendErrorResponse("This applicant didn't ask for travel reimbursement", null, 409);
    }

    const { set, unset } = travelUpdate(travel.decision);
    const update = {
      $set: { ...set, processedBy: auth.admin.email, processedAt: new Date(), status: ACTIONS[action as Action] },
      ...(unset ? { $unset: unset } : {}),
    };
    // Conditional on a decidable status AND the status just read: of two concurrent decisions only
    // the first write matches and sends an email; the other gets a 409.
    const updated = await Application.findOneAndUpdate(
      { _id: applicationId, status: { $in: DECIDABLE_STATUSES, $eq: readStatus } },
      update,
      { new: true },
    );
    if (!updated) return sendErrorResponse("The application changed while it was being updated. Reload and try again.", null, 409);

    try {
      const sent = await sendDecisionEmail(action as Action, application, travel.decision);
      if (!sent) console.log("Decision email not sent, but the status was updated");
    } catch (error) {
      console.error("Error sending the decision email:", describeError(error));
    }

    return sendSuccessResponse("Status updated", ACTIONS[action as Action], 200);
  } catch (error) {
    console.error("Error in PATCH /api/status/[applicationId]:", describeError(error));
    return sendErrorResponse("Something went wrong while updating the status", null, 500);
  }
};
