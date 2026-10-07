import type { NextRequest } from "next/server";

import { getEmailEventConfig, type EmailEventConfig } from "@/config/event";
import { parseTravelDecision, type TravelDecision } from "@/lib/conuhacks/travel-decision";
import { fetchIsSuperAdmin, requireAdmin } from "@/lib/require-admin";
import Application from "@/repository/models/application";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import { sendDecisionEmail, type DecisionStatus } from "@/utils/applicantEmails";
import { describeError } from "@/utils/describeError";
import { assertEmailSettings } from "@/utils/sendEmail";

const ACTIONS = { admit: "Admitted", waitlist: "Waitlisted", reject: "Refused" } as const satisfies Record<string, DecisionStatus>;
type Action = keyof typeof ACTIONS;

const OBJECT_ID_HEX = /^[0-9a-fA-F]{24}$/;

/** The statuses a decision may start from (never Unverified, Incomplete, Confirmed, checked in, …). */
const DECIDABLE_STATUSES = ["Submitted", "Admitted", "Waitlisted", "Refused"];

/** Body keys that carry a travel decision (approve, decline, amount, currency). Super admins only (A2). */
const TRAVEL_DECISION_KEYS = ["travelReimbursement", "isTravelReimbursementApproved", "travelReimbursementAmount", "travelReimbursementCurrency"];

type Applicant = {
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  communicationLanguage?: unknown;
  status?: unknown;
  travelReimbursement?: unknown;
};

const carriesTravelDecision = (input: Record<string, unknown>): boolean =>
  TRAVEL_DECISION_KEYS.some((key) => input[key] !== undefined && input[key] !== null);

/** The admin-only travel fields a decision writes. Never read or accepted by the registration app. */
function travelUpdate(action: Action, decision: TravelDecision | null): { set: Record<string, unknown>; unset?: Record<string, ""> } {
  // Waitlisting or refusing withdraws any stored approval (L1). Automatic, so any admin may trigger it.
  if (action !== "admit") {
    return { set: {}, unset: { isTravelReimbursementApproved: "", travelReimbursementAmount: "", travelReimbursementCurrency: "" } };
  }
  if (!decision) return { set: {} };
  if (!decision.approved) {
    return { set: { isTravelReimbursementApproved: false }, unset: { travelReimbursementAmount: "", travelReimbursementCurrency: "" } };
  }
  return {
    set: { isTravelReimbursementApproved: true, travelReimbursementAmount: decision.amount, travelReimbursementCurrency: decision.currency },
  };
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

    // The decision email needs the event email settings (not EVENT_ID or EVENT_MEALS) and the sender/reply-to
    // settings: refuse before writing anything if they are broken, rather than save a decision whose email can only fail.
    let config: EmailEventConfig;
    try {
      config = getEmailEventConfig();
      assertEmailSettings();
    } catch (error) {
      console.error("Status change refused, event settings are invalid:", describeError(error));
      return sendErrorResponse("Event settings are not configured. No status was changed.", null, 500);
    }

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

    const { set, unset } = travelUpdate(action as Action, travel.decision);
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
      // In the applicant's language and name as read before the write (the write changes neither).
      const sent = await sendDecisionEmail(ACTIONS[action as Action], application, config, travel.decision ?? undefined);
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
