import type { NextRequest } from "next/server";

import connectMongoDB from "@/repository/mongoose";
import Application from "@/repository/models/application";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import { redactSensitiveApplicantFields } from "@/lib/conuhacks/redact-applicant-fields";
import { fetchIsSuperAdmin, requireAdmin } from "@/lib/require-admin";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ applicationId: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { applicationId } = await params;
    const { isStarred } = await request.json();

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
    console.error("Error updating star status:", error);
    return sendErrorResponse("Internal Server Error", null, 500);
  }
}
