import type { NextRequest } from "next/server";

import mongoose from "mongoose";

import { getGridFSBucket } from "@/lib/gridfs";
import {
  EMPTY_FILE_FIELD,
  deleteApplicationFile,
  replaceApplicationFile,
  validateResumeUpload,
  type ApplicationFileField,
} from "@/lib/conuhacks/resume-storage";
import { requireAdmin } from "@/lib/require-admin";
import Application from "@/repository/models/application";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";

type RouteContext = { params: Promise<{ applicationId: string }> };

function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : "unknown error";
}

/**
 * POST: Super admins upload a replacement resume. Stored like the registration app does
 * (GridFS _id = application _id, PDF only, verified by magic bytes), so the applicant's
 * dashboard serves the new file.
 */
export const POST = async (req: NextRequest, { params }: RouteContext) => {
  const auth = await requireAdmin(req, { superAdmin: true });
  if (!auth.ok) return auth.response;

  try {
    const { applicationId } = await params;
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return sendErrorResponse("Invalid application id", null, 400);
    }

    await connectMongoDB();

    const application = await Application.findById(applicationId);
    if (!application) {
      return sendErrorResponse("Application not found", null, 404);
    }

    const formData = await req.formData();
    const validated = await validateResumeUpload(formData.get("resume"));
    if (!validated.ok) {
      return sendErrorResponse(validated.message, null, validated.status);
    }

    let resume: ApplicationFileField;
    try {
      resume = await replaceApplicationFile(getGridFSBucket(), applicationId, validated);
    } catch (error) {
      // The GridFS write failed (replaceApplicationFile already cleaned up any partial file
      // left under this id). Clear the stored metadata too, so a stale `size > 0` never claims
      // a file that isn't actually there, and report failure without leaking internals.
      console.error("Error writing resume to GridFS:", describeError(error));
      try {
        await Application.findByIdAndUpdate(applicationId, { $set: { resume: EMPTY_FILE_FIELD } });
      } catch (cleanupError) {
        console.error("Error clearing resume field after a failed write:", describeError(cleanupError));
      }
      return sendErrorResponse("Failed to upload resume", null, 500);
    }

    const updatedApplication = await Application.findByIdAndUpdate(applicationId, { $set: { resume } }, { new: true });
    if (!updatedApplication) {
      return sendErrorResponse("Failed to update application with resume", null, 500);
    }

    return sendSuccessResponse("Resume uploaded successfully", { resume }, 200);
  } catch (error) {
    console.error("Error in POST /api/application/[applicationId]/resume:", describeError(error));
    return sendErrorResponse("Failed to upload resume", null, 500);
  }
};

/**
 * DELETE: Super admins remove the resume. The field goes back to the registration defaults.
 */
export const DELETE = async (req: NextRequest, { params }: RouteContext) => {
  const auth = await requireAdmin(req, { superAdmin: true });
  if (!auth.ok) return auth.response;

  try {
    const { applicationId } = await params;
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return sendErrorResponse("Invalid application id", null, 400);
    }

    await connectMongoDB();

    const application = await Application.findById(applicationId);
    if (!application) {
      return sendErrorResponse("Application not found", null, 404);
    }

    const removed = await deleteApplicationFile(getGridFSBucket(), applicationId);
    if (!removed && !(Number(application.resume?.size) > 0)) {
      return sendErrorResponse("No resume to delete", null, 400);
    }

    await Application.findByIdAndUpdate(applicationId, { $set: { resume: EMPTY_FILE_FIELD } }, { new: true });

    return sendSuccessResponse("Resume deleted successfully", null, 200);
  } catch (error) {
    console.error("Error in DELETE /api/application/[applicationId]/resume:", describeError(error));
    return sendErrorResponse("Failed to delete resume", null, 500);
  }
};
