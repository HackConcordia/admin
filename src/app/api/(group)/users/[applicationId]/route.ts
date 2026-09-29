import type { NextRequest } from "next/server";

import { GridFSBucket } from "mongodb";
import mongoose from "mongoose";

import connectMongoDB from "@/repository/mongoose";
import { sendSuccessResponse, sendErrorResponse } from "@/repository/response";
import Application from "@/repository/models/application";
import { redactSensitiveApplicantFields } from "@/lib/conuhacks/redact-applicant-fields";
import { fetchIsSuperAdmin, requireAdmin } from "@/lib/require-admin";

export const GET = async (req: NextRequest, { params }: { params: Promise<{ applicationId: string }> }) => {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { applicationId: userId } = await params;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return sendErrorResponse("Invalid application id", null, 400);
    }

    await connectMongoDB();

    const application = await Application.findById(userId);

    if (!application) {
      return sendErrorResponse("No matching application found for the provided user ID", null, 404);
    }

    // console.log(user.profile.professionalInfo.resume);

    let resumeMetadata = null;

    if (application.resume.size > 0) {
      const resumeId = application.resume.id; // Assuming resume field contains an object with id

      if (!mongoose.connection.db) {
        throw new Error("Database connection is not established");
      }

      const gridFSBucket = new GridFSBucket(mongoose.connection.db);

      const file = await gridFSBucket.find({ _id: new mongoose.Types.ObjectId(resumeId) }).toArray();

      if (file.length > 0) {
        resumeMetadata = file[0].metadata;
      }
    }

    const isSuperAdmin = (await fetchIsSuperAdmin(auth.admin.adminId)) === true;
    return sendSuccessResponse(
      "User information retrieved successfully",
      redactSensitiveApplicantFields({ ...application.toObject(), resumeMetadata }, isSuperAdmin),
    );
  } catch (error) {
    // Name and Mongo code only: messages can carry applicant data.
    const code = error instanceof Error ? (error as { code?: unknown }).code : undefined;
    const description = !(error instanceof Error) ? "unknown error" : code === undefined ? error.name : `${error.name} (code ${String(code)})`;
    console.error("Error in GET /api/users/[applicationId]:", description);

    return sendErrorResponse("Failed to retrieve user information", null, 500);
  }
};
