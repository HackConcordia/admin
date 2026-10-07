import type { NextRequest } from "next/server";

import mongoose from "mongoose";

import { getEmailEventConfig } from "@/config/event";
import { buildApplicationUpdate } from "@/lib/conuhacks/application-update";
import { redactSensitiveApplicantFields } from "@/lib/conuhacks/redact-applicant-fields";
import { fetchIsSuperAdmin, requireAdmin } from "@/lib/require-admin";
import { DECISION_STATUSES, isCheckedInStatus, isSameStatus } from "@/lib/status";
import Application from "@/repository/models/application";
import CheckIn from "@/repository/models/checkin";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import { sendDiscordInviteEmail, type EmailApplicant } from "@/utils/applicantEmails";
import { describeError } from "@/utils/describeError";

type RouteContext = { params: Promise<{ applicationId: string }> };

/** Same side effects as the registration app's own "confirm attendance": a CheckIn record, plus the Discord invite. */
async function onConfirmed(application: EmailApplicant): Promise<void> {
  const email = String(application.email ?? "");
  try {
    await CheckIn.updateOne({ email }, { $setOnInsert: { email, isCheckedIn: false } }, { upsert: true });
  } catch (error) {
    console.error("Error creating CheckIn document:", describeError(error));
  }
  try {
    // getEmailEventConfig() may throw (broken settings): the status is saved, only the email is skipped.
    const sent = await sendDiscordInviteEmail(application, getEmailEventConfig());
    if (!sent) console.log("Discord invite email not sent; the status was still updated");
  } catch (error) {
    console.error("Error sending the Discord invite email:", describeError(error));
  }
}

async function onLeftConfirmed(email: string): Promise<void> {
  try {
    await CheckIn.findOneAndDelete({ email });
  } catch (error) {
    console.error("Error deleting CheckIn document:", describeError(error));
  }
}

/** GET: any admin. Super-admin-only fields are blanked for regular reviewers (DB-verified role). */
export const GET = async (req: NextRequest, { params }: RouteContext) => {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { applicationId } = await params;
    if (!mongoose.Types.ObjectId.isValid(applicationId)) return sendErrorResponse("Invalid application id", null, 400);

    await connectMongoDB();
    const application = await Application.findById(applicationId);
    if (!application) return sendErrorResponse("Application not found", null, 404);

    const isSuperAdmin = (await fetchIsSuperAdmin(auth.admin.adminId)) === true;
    return sendSuccessResponse(
      "Application retrieved successfully",
      redactSensitiveApplicantFields(application.toObject(), isSuperAdmin),
      200,
    );
  } catch (error) {
    console.error("Error in GET /api/application/[applicationId]:", describeError(error));
    return sendErrorResponse("Failed to retrieve application", null, 500);
  }
};

/** PUT: super admins edit an application, validated against the XI registry. Email is never editable. */
export const PUT = async (req: NextRequest, { params }: RouteContext) => {
  const auth = await requireAdmin(req, { superAdmin: true });
  if (!auth.ok) return auth.response;

  try {
    const { applicationId } = await params;
    if (!mongoose.Types.ObjectId.isValid(applicationId)) return sendErrorResponse("Invalid application id", null, 400);

    const body: unknown = await req.json().catch(() => undefined);

    await connectMongoDB();
    const existingApplication = await Application.findById(applicationId);
    if (!existingApplication) return sendErrorResponse("Application not found", null, 404);

    // One validation pass, against the stored document: level-dependent answers and unchanged off-list values.
    const stored = (typeof existingApplication.toObject === "function" ? existingApplication.toObject() : existingApplication) as Record<string, unknown>;
    const built = buildApplicationUpdate(body, { stored });
    if (!built.ok) return sendErrorResponse(built.error, null, 400);

    const previousStatus = String(stored.status ?? "");
    const requestedStatus = typeof built.set.status === "string" ? built.set.status : undefined;
    // The form sends the status only when it was changed; a resent, unchanged one (or the legacy
    // CheckedIn spelling of the same status) is not a change and never touches processedBy.
    const nextStatus = requestedStatus !== undefined && !isSameStatus(requestedStatus, previousStatus) ? requestedStatus : undefined;
    const { status: _ignored, ...setWithoutStatus } = built.set;
    const set = nextStatus === undefined ? setWithoutStatus : built.set;

    if (nextStatus !== undefined) {
      if (DECISION_STATUSES.includes(nextStatus)) {
        return sendErrorResponse("Use the Admit, Waitlist or Refuse decision buttons to set this status", null, 400);
      }
      const expected = (body as Record<string, unknown>).expectedStatus;
      if (typeof expected !== "string") return sendErrorResponse("expectedStatus is required to change the status", null, 400);
      if (!isSameStatus(expected, previousStatus)) {
        return sendErrorResponse("Application status changed since it was loaded; reload and try again", null, 409);
      }
    }

    const isChangingToConfirmed = nextStatus === "Confirmed" && previousStatus !== "Confirmed";
    // Leaving Confirmed for anything but checked in (C4) removes the CheckIn record.
    const isLeavingConfirmed =
      previousStatus === "Confirmed" && nextStatus !== undefined && nextStatus !== "Confirmed" && !isCheckedInStatus(nextStatus);

    // A status change records the session admin and is conditional on the status just read, so it
    // loses with 409 to a concurrent decision instead of silently overwriting it.
    const updatedApplication =
      nextStatus !== undefined
        ? await Application.findOneAndUpdate(
            { _id: applicationId, status: previousStatus },
            { $set: { ...set, processedBy: auth.admin.email, processedAt: new Date() } },
            { new: true, runValidators: true },
          )
        : await Application.findByIdAndUpdate(applicationId, { $set: set }, { new: true, runValidators: true });

    if (!updatedApplication) {
      return nextStatus !== undefined
        ? sendErrorResponse("Application status changed since it was loaded; reload and try again", null, 409)
        : sendErrorResponse("Failed to update application", null, 500);
    }

    if (isChangingToConfirmed) await onConfirmed(stored);
    if (isLeavingConfirmed) await onLeftConfirmed(String(stored.email ?? ""));

    return sendSuccessResponse("Application updated successfully", updatedApplication.toObject(), 200);
  } catch (error) {
    console.error("Error in PUT /api/application/[applicationId]:", describeError(error));
    if (error instanceof Error && error.name === "ValidationError") {
      return sendErrorResponse("A value is not allowed by the schema", null, 400);
    }
    return sendErrorResponse("Failed to update application", null, 500);
  }
};

/** DELETE: super admins only. */
export const DELETE = async (req: NextRequest, { params }: RouteContext) => {
  const auth = await requireAdmin(req, { superAdmin: true });
  if (!auth.ok) return auth.response;

  try {
    const { applicationId } = await params;
    if (!mongoose.Types.ObjectId.isValid(applicationId)) return sendErrorResponse("Invalid application id", null, 400);

    await connectMongoDB();
    const deleted = await Application.findByIdAndDelete(applicationId);
    if (!deleted) return sendErrorResponse("Application not found", null, 404);

    return sendSuccessResponse("Application deleted successfully", null, 200);
  } catch (error) {
    console.error("Error in DELETE /api/application/[applicationId]:", describeError(error));
    return sendErrorResponse("Failed to delete application", null, 500);
  }
};
