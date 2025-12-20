import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";

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

    const resumeId = application.resume?.id; // stored as string in schema

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

    // Convert Node.js Readable stream to Web Streams API ReadableStream
    const stream = new ReadableStream({
      start(controller) {
        downloadStream.on("data", (chunk) => controller.enqueue(chunk));
        downloadStream.on("end", () => controller.close());
        downloadStream.on("error", (err) => controller.error(err));
      },
    });

    // Get content type from metadata or use default
    const contentType = file.metadata?.mimetype || file.contentType || "application/pdf";
    const filename = file.filename || "resume";

    return new NextResponse(stream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error retrieving file:", error);

    return sendErrorResponse("Error retrieving file", error, 500);
  }
};
