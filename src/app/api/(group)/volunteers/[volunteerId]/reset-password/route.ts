import type { NextRequest } from "next/server";
import mongoose from "mongoose";

import Volunteer from "@/repository/models/volunteer";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import type { IVolunteerCredentials } from "@/interfaces/IVolunteer";
import { hashPassword } from "@/lib/password";
import { requireAdmin } from "@/lib/require-admin";
import { generateVolunteerPassword } from "@/lib/volunteer-password";
import { describeError, toVolunteerListItem } from "@/lib/volunteers";

export const POST = async (req: NextRequest, { params }: { params: Promise<{ volunteerId: string }> }) => {
  const auth = await requireAdmin(req, { superAdmin: true });
  if (!auth.ok) return auth.response;

  const { volunteerId } = await params;

  if (!volunteerId || !mongoose.Types.ObjectId.isValid(volunteerId)) {
    return sendErrorResponse("Invalid volunteer id", null, 400);
  }

  try {
    await connectMongoDB();

    const generatedPassword = generateVolunteerPassword();
    const updated = await Volunteer.findByIdAndUpdate(
      volunteerId,
      { $set: { password: await hashPassword(generatedPassword) } },
      { new: true, projection: { firstName: 1, lastName: 1, email: 1, password: 1 } },
    );

    if (!updated) {
      return sendErrorResponse("Volunteer not found", null, 404);
    }

    // `updated` carries the new hash, so needsPasswordReset comes out false; toVolunteerListItem
    // drops the hash itself. This is the only response that ever carries the new password.
    const credentials: IVolunteerCredentials = { ...toVolunteerListItem(updated), generatedPassword };
    const response = sendSuccessResponse("Volunteer password reset successfully", credentials, 200);
    response.headers.set("Cache-Control", "no-store");

    return response;
  } catch (error) {
    console.error("Failed to reset volunteer password:", describeError(error));
    return sendErrorResponse("Failed to reset volunteer password", null, 500);
  }
};
