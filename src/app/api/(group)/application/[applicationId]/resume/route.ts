import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import { Readable } from "stream";

import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import Application from "@/repository/models/application";
import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * POST: Upload a new resume for an application
 * Replaces any existing resume
 */
export const POST = async (
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

    await connectMongoDB();

    // Check if application exists
    const application = await Application.findById(applicationId);
    if (!application) {
      return sendErrorResponse("Application not found", null, 404);
    }

    // Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return sendErrorResponse("No file provided", null, 400);
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return sendErrorResponse(
        "Invalid file type. Only PDF and Word documents are allowed.",
        null,
        400
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return sendErrorResponse(
        "File too large. Maximum size is 5MB.",
        null,
        400
      );
    }

    if (!mongoose.connection.db) {
      throw new Error("Database connection is not established");
    }

    const gridFSBucket = new GridFSBucket(mongoose.connection.db);

    // Delete existing resume if it exists
    if (application.resume?.id) {
      try {
        const existingResumeId = new mongoose.Types.ObjectId(application.resume.id);
        await gridFSBucket.delete(existingResumeId);
      } catch (deleteError) {
        // Log but don't fail if old file deletion fails
        console.warn("Failed to delete existing resume:", deleteError);
      }
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a readable stream from the buffer
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);

    // Generate a unique filename
    const filename = `${applicationId}_${Date.now()}_${file.name}`;

    // Upload to GridFS
    const uploadStream = gridFSBucket.openUploadStream(filename, {
      metadata: {
        originalName: file.name,
        mimetype: file.type,
        applicationId: applicationId,
        uploadedAt: new Date(),
      },
    });

    // Pipe the readable stream to GridFS
    await new Promise<void>((resolve, reject) => {
      readableStream
        .pipe(uploadStream)
        .on("finish", () => resolve())
        .on("error", (error) => reject(error));
    });

    // Update the application with new resume metadata
    const resumeMetadata = {
      id: uploadStream.id.toString(),
      originalName: file.name,
      encoding: "binary",
      size: file.size,
      mimetype: file.type,
      url: `/api/files/${uploadStream.id.toString()}`,
    };

    const updatedApplication = await Application.findByIdAndUpdate(
      applicationId,
      { $set: { resume: resumeMetadata } },
      { new: true }
    );

    if (!updatedApplication) {
      return sendErrorResponse("Failed to update application with resume", null, 500);
    }

    return sendSuccessResponse(
      "Resume uploaded successfully",
      {
        resume: resumeMetadata,
      },
      200
    );
  } catch (error) {
    console.error("Error in POST /api/application/[applicationId]/resume:", error);
    return sendErrorResponse("Failed to upload resume", error, 500);
  }
};

/**
 * DELETE: Remove resume from an application
 */
export const DELETE = async (
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

    await connectMongoDB();

    // Check if application exists
    const application = await Application.findById(applicationId);
    if (!application) {
      return sendErrorResponse("Application not found", null, 404);
    }

    // Check if there's a resume to delete
    if (!application.resume?.id) {
      return sendErrorResponse("No resume to delete", null, 400);
    }

    if (!mongoose.connection.db) {
      throw new Error("Database connection is not established");
    }

    const gridFSBucket = new GridFSBucket(mongoose.connection.db);

    // Delete the file from GridFS
    try {
      const resumeId = new mongoose.Types.ObjectId(application.resume.id);
      await gridFSBucket.delete(resumeId);
    } catch (deleteError) {
      console.warn("Failed to delete resume from GridFS:", deleteError);
    }

    // Clear the resume field in the application
    const updatedApplication = await Application.findByIdAndUpdate(
      applicationId,
      {
        $set: {
          resume: {
            id: "",
            originalName: "",
            encoding: "utf-8",
            size: 0,
            mimetype: "",
            url: "",
          },
        },
      },
      { new: true }
    );

    if (!updatedApplication) {
      return sendErrorResponse("Failed to update application", null, 500);
    }

    return sendSuccessResponse("Resume deleted successfully", null, 200);
  } catch (error) {
    console.error("Error in DELETE /api/application/[applicationId]/resume:", error);
    return sendErrorResponse("Failed to delete resume", error, 500);
  }
};

