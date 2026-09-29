import type { NextRequest } from "next/server";

import mongoose from "mongoose";

import { buildApplicationUpdate } from "@/lib/conuhacks/application-update";
import { redactSensitiveApplicantFields } from "@/lib/conuhacks/redact-applicant-fields";
import { fetchIsSuperAdmin, requireAdmin } from "@/lib/require-admin";
import { isCheckedInStatus } from "@/lib/status";
import Application from "@/repository/models/application";
import CheckIn from "@/repository/models/checkin";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import { sendDiscordLink } from "@/utils/admissionEmailConfig";

type RouteContext = { params: Promise<{ applicationId: string }> };

/** Name and Mongo code only: messages can carry applicant data (an E11000 message includes the key). */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error";
  const code = (error as { code?: unknown }).code;
  return code === undefined ? error.name : `${error.name} (code ${String(code)})`;
}

/** Same side effects as the registration app's own "confirm attendance": a CheckIn record, plus the Discord invite. */
async function onConfirmed(application: { email?: unknown; firstName?: unknown; lastName?: unknown }): Promise<void> {
  const email = String(application.email ?? "");
  try {
    await CheckIn.updateOne({ email }, { $setOnInsert: { email, isCheckedIn: false } }, { upsert: true });
  } catch (error) {
    console.error("Error creating CheckIn document:", describeError(error));
  }
  try {
    const sent = await sendDiscordLink(email, String(application.firstName ?? ""), String(application.lastName ?? ""));
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
    // First pass before touching the database: rejects anything invalid on its own.
    const precheck = buildApplicationUpdate(body);
    if (!precheck.ok) return sendErrorResponse(precheck.error, null, 400);

    await connectMongoDB();
    const existingApplication = await Application.findById(applicationId);
    if (!existingApplication) return sendErrorResponse("Application not found", null, 404);

    // Second pass with the stored document: level-dependent answers and unchanged off-list values.
    const stored = (typeof existingApplication.toObject === "function" ? existingApplication.toObject() : existingApplication) as Record<string, unknown>;
    const update = buildApplicationUpdate(body, { stored });
    if (!update.ok) return sendErrorResponse(update.error, null, 400);

    const previousStatus = String(stored.status ?? "");
    const nextStatus = typeof update.set.status === "string" ? update.set.status : undefined;
    const isStatusChanging = nextStatus !== undefined && nextStatus !== previousStatus;
    const isChangingToConfirmed = nextStatus === "Confirmed" && previousStatus !== "Confirmed";
    // Leaving Confirmed for anything but checked in (C4) removes the CheckIn record.
    const isLeavingConfirmed =
      previousStatus === "Confirmed" && nextStatus !== undefined && nextStatus !== "Confirmed" && !isCheckedInStatus(nextStatus);

    // A status change records the session admin and is conditional on the status just read, so it
    // loses with 409 to a concurrent decision instead of silently overwriting it.
    const updatedApplication = isStatusChanging
      ? await Application.findOneAndUpdate(
          { _id: applicationId, status: previousStatus },
          { $set: { ...update.set, processedBy: auth.admin.email, processedAt: new Date() } },
          { new: true, runValidators: true },
        )
      : await Application.findByIdAndUpdate(applicationId, { $set: update.set }, { new: true, runValidators: true });

    if (!updatedApplication) {
      return isStatusChanging
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
