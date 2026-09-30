import type { NextRequest } from "next/server";

import mongoose from "mongoose";

import connectMongoDB from "@/repository/mongoose";
import Application from "@/repository/models/application";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import { redactSensitiveApplicantFields } from "@/lib/conuhacks/redact-applicant-fields";
import { fetchIsSuperAdmin, requireAdmin } from "@/lib/require-admin";

// Name and Mongo code only: error messages can carry applicant data.
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error";
  const code = (error as { code?: unknown }).code;
  return code === undefined ? error.name : `${error.name} (code ${String(code)})`;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ applicationId: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { applicationId } = await params;
    if (!mongoose.Types.ObjectId.isValid(applicationId)) return sendErrorResponse("Invalid application id", null, 400);

    const body: unknown = await request.json().catch(() => null);
    const isStarred = typeof body === "object" && body !== null ? (body as { isStarred?: unknown }).isStarred : undefined;

    if (typeof isStarred !== "boolean") {
      return sendErrorResponse("isStarred must be a boolean", null, 400);
    }

    await connectMongoDB();

    const application = await Application.findById(applicationId);
    if (!application) {
      return sendErrorResponse("Application not found", null, 404);
    }

    const updatedApp = await Application.findByIdAndUpdate(applicationId, { isStarred }, { new: true });
    if (!updatedApp) {
      return sendErrorResponse("Application not found", null, 404);
    }

    const isSuperAdmin = (await fetchIsSuperAdmin(auth.admin.adminId)) === true;
    return sendSuccessResponse("Application updated successfully", redactSensitiveApplicantFields(updatedApp.toObject(), isSuperAdmin), 200);
  } catch (error) {
    console.error("Error updating star status:", describeError(error));
    return sendErrorResponse("Internal Server Error", null, 500);
  }
}
