import type { NextRequest } from "next/server";

import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import Application from "@/repository/models/application";
import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";

/**
 * PATCH: Updates application metadata (comments and/or skillTags)
 * Allows admins to add comments and skill tags to applications
 */
export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) => {
  try {
    const { applicationId } = await params;
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return sendErrorResponse("Unauthorized", null, 401);
    }

    const payload = await verifyAuthToken(token);
    if (!payload) {
      return sendErrorResponse("Unauthorized", null, 401);
    }

    const { comments, skillTags } = await req.json();

    // Validate that at least one field is provided
    if (comments === undefined && skillTags === undefined) {
      return sendErrorResponse(
        "At least one field (comments or skillTags) must be provided",
        null,
        400
      );
    }

    await connectMongoDB();

    // Check if application exists
    const application = await Application.findById(applicationId);
    if (!application) {
      return sendErrorResponse("Application not found", null, 404);
    }

    // Build update object with only provided fields
    const updateFields: Record<string, any> = {};
    const unsetFields: Record<string, any> = {};
    if (comments !== undefined) {
      // If comments is empty string or null, remove the field from DB
      if (comments === "" || comments === null) {
        unsetFields.comments = "";
      } else {
        updateFields.comments = comments;
      }
    }

    if (skillTags !== undefined) {
      // If skillTags is empty array or null, remove the field from DB
      if (!skillTags || skillTags.length === 0) {
        unsetFields.skillTags = "";
      } else {
        updateFields.skillTags = skillTags;
      }
    }

    // Build the update operation
    const updateOperation: Record<string, any> = {};
    if (Object.keys(updateFields).length > 0) {
      updateOperation.$set = updateFields;
    }
    if (Object.keys(unsetFields).length > 0) {
      updateOperation.$unset = unsetFields;
    }

    // Update application
    const updatedApplication = await Application.findByIdAndUpdate(
      applicationId,
      Object.keys(updateOperation).length > 0 ? updateOperation : updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedApplication) {
      return sendErrorResponse("Failed to update application", null, 500);
    }

    return sendSuccessResponse(
      "Application metadata updated successfully",
      {
        comments: updatedApplication.comments,
        skillTags: updatedApplication.skillTags,
      },
      200
    );
  } catch (error) {
    console.error("Error in PATCH /api/application/[applicationId]/metadata:", error);
    return sendErrorResponse(
      "Failed to update application metadata",
      error,
      500
    );
  }
};

