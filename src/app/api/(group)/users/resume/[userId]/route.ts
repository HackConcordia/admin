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
    const downloadStream = gridFSBucket.openDownloadStream(objectId);

    const headers = new Headers();

    return new Promise<NextResponse>((resolve, reject) => {
      downloadStream.on("file", (file) => {
        headers.append("Content-Type", file.contentType || "application/octet-stream");
        headers.append("Content-Disposition", `attachment; filename="${file.filename || "resume"}"`);
      });

      const chunks: any[] = [];

      downloadStream.on("data", (chunk) => {
        chunks.push(chunk);
      });

      downloadStream.on("end", () => {
        const buffer = Buffer.concat(chunks);

        const response = new NextResponse(buffer, {
          headers,
          status: 200,
        });

        resolve(response); // Ensure this is a valid NextResponse
      });

      downloadStream.on("error", (error) => {
        console.error("Error retrieving file:", error);
        reject(new NextResponse("Error retrieving file", { status: 500 }));
      });
    });
  } catch (error) {
    console.error("Error retrieving file:", error);

    return sendErrorResponse("Error retrieving file", error, 500);
  }
};
