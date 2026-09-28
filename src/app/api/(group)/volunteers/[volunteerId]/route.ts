import type { NextRequest } from "next/server";
import mongoose from "mongoose";

import Volunteer from "@/repository/models/volunteer";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import { requireAdmin } from "@/lib/require-admin";
import { describeError } from "@/lib/volunteers";

export const DELETE = async (req: NextRequest, { params }: { params: Promise<{ volunteerId: string }> }) => {
  const auth = await requireAdmin(req, { superAdmin: true });
  if (!auth.ok) return auth.response;

  const { volunteerId } = await params;

  if (!volunteerId || !mongoose.Types.ObjectId.isValid(volunteerId)) {
    return sendErrorResponse("Invalid volunteer id", null, 400);
  }

  try {
    await connectMongoDB();

    // Only the email is loaded back; the stored password never leaves the database here.
    const deletedVolunteer = await Volunteer.findByIdAndDelete(volunteerId, { projection: { email: 1 } });

    if (!deletedVolunteer) {
      return sendErrorResponse("Volunteer not found", null, 404);
    }

    return sendSuccessResponse(
      "Volunteer deleted successfully",
      { _id: String(deletedVolunteer._id), email: deletedVolunteer.email },
      200,
    );
  } catch (error) {
    console.error("Failed to delete volunteer:", describeError(error));
    return sendErrorResponse("Failed to delete volunteer", null, 500);
  }
};
