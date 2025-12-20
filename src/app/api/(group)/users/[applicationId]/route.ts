import type { NextRequest } from "next/server";

import { GridFSBucket } from "mongodb";
import mongoose from "mongoose";

import connectMongoDB from "@/repository/mongoose";
import { sendSuccessResponse, sendErrorResponse } from "@/repository/response";
import Application from "@/repository/models/application";

export const GET = async (req: NextRequest, { params }: { params: Promise<{ applicationId: string }> }) => {
  try {
    const { applicationId: userId } = await params;

    console.log("userId:", userId);

    if (!userId) {
      return sendErrorResponse("userId is not defined", {}, 400);
    }

    await connectMongoDB();

    const application = await Application.findById(userId);

    if (!application) {
      return sendErrorResponse("No matching application found for the provided user ID", {}, 404);
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

    return sendSuccessResponse("User information retrieved successfully", {
      ...application.toObject(),
      resumeMetadata,
    });
  } catch (error) {
    console.error("Error during GET request:", error);

    return sendErrorResponse("Failed to retrieve user information", error, 500);
  }
};
