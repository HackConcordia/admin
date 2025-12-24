import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import { Readable } from "stream";

import { sendErrorResponse } from "@/repository/response";
import connectMongoDB from "@/repository/mongoose";
import Application from "@/repository/models/application";

export const GET = async (req: NextRequest, ctx: { params: Promise<{ userId: string }> }) => {
  const { userId } = await ctx.params;

  if (!userId) {
    return sendErrorResponse("userId is not defined", {}, 404);
  }

  try {
    await connectMongoDB();
    const application = await Application.findById(userId);

    if (!application) {
      return sendErrorResponse("No matching user found for the provided user ID", {}, 404);
    }

    const resumeId = application.resume?.id;

    if (!resumeId) {
      return sendErrorResponse("User has no resume on file", {}, 404);
    }

    if (!mongoose.connection.db) {
      return sendErrorResponse("Database connection is not established", {}, 500);
    }

    const gridFSBucket = new GridFSBucket(mongoose.connection.db);
    const objectId = new mongoose.Types.ObjectId(resumeId);

    // Check if the file exists
    const files = await gridFSBucket.find({ _id: objectId }).toArray();

    if (files.length === 0) {
      return sendErrorResponse("Resume file not found in storage", {}, 404);
    }

    const file = files[0];
    const downloadStream = gridFSBucket.openDownloadStream(objectId);

    // Buffer the stream completely (like export route does)
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      downloadStream.on("data", (chunk) => chunks.push(chunk));
      downloadStream.on("end", () => resolve());
      downloadStream.on("error", (err) => reject(err));
    });

    // Combine all chunks into a single buffer
    const fileBuffer = Buffer.concat(chunks);

    // Get content type from metadata or use default
    const contentType = file.metadata?.mimetype || file.contentType || "application/pdf";

    // Use metadata.originalName first, then fall back to filename
    const originalName = file.metadata?.originalName || file.filename || "resume.pdf";
    const fallbackName = "resume.pdf";

    // Properly encode the filename for Content-Disposition header (RFC 5987)
    let utf8Name: string;
    try {
      utf8Name = encodeURIComponent(originalName);
    } catch (error) {
      utf8Name = encodeURIComponent(fallbackName);
    }

    const contentDisposition =
      `inline; filename="${fallbackName}"; filename*=UTF-8''${utf8Name}`;

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
        "Content-Length": fileBuffer.length.toString(),
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    console.error("Error retrieving file:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    return sendErrorResponse(
      "Error retrieving file",
      { message: errorMessage, ...(errorStack && { stack: errorStack }) },
      500
    );
  }
};
