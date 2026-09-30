import type { NextRequest } from "next/server";

import mongoose from "mongoose";

import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import Application from "@/repository/models/application";
import { requireAdmin } from "@/lib/require-admin";

const COMMENTS_MAX = 5000;
const TAG_MAX = 200;

type Metadata = { ok: true; comments?: string; skillTags?: string[] } | { ok: false; error: string };

/** Validates and trims the two reviewer fields (same limits as the super-admin edit). */
function parseMetadata(body: unknown): Metadata {
  const input = typeof body === "object" && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const result: { comments?: string; skillTags?: string[] } = {};
  if (input.comments !== undefined) {
    if (input.comments !== null && typeof input.comments !== "string") return { ok: false, error: "comments must be a string" };
    const comments = (input.comments ?? "").trim();
    if (comments.length > COMMENTS_MAX) return { ok: false, error: `comments must be ${COMMENTS_MAX} characters or fewer` };
    result.comments = comments;
  }
  if (input.skillTags !== undefined && input.skillTags !== null) {
    const tags = input.skillTags;
    if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string")) return { ok: false, error: "skillTags must be a list of strings" };
    const trimmed = (tags as string[]).map((tag) => tag.trim()).filter(Boolean);
    if (trimmed.some((tag) => tag.length > TAG_MAX)) return { ok: false, error: `skillTags must be ${TAG_MAX} characters or fewer` };
    result.skillTags = trimmed;
  }
  if (input.skillTags === null) result.skillTags = [];
  return { ok: true, ...result };
}

/**
 * PATCH: Updates application metadata (comments and/or skillTags)
 * Allows admins to add comments and skill tags to applications
 */
export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) => {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { applicationId } = await params;
    if (!mongoose.Types.ObjectId.isValid(applicationId)) return sendErrorResponse("Invalid application id", null, 400);

    const parsed = parseMetadata(await req.json().catch(() => undefined));
    if (!parsed.ok) return sendErrorResponse(parsed.error, null, 400);
    const { comments, skillTags } = parsed;

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
      if (comments === "") {
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
    console.error("Error in PATCH /api/application/[applicationId]/metadata:", error instanceof Error ? error.name : "unknown error");
    return sendErrorResponse("Failed to update application metadata", null, 500);
  }
};

