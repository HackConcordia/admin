import type { NextRequest } from "next/server";

import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import CheckIn from "@/repository/models/checkin";
import type { ICheckIn } from "@/interfaces/ICheckIn";

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ email: string }> }) => {
  try {
    const { email } = await params;

    if (!email) {
      return sendErrorResponse("email is required", null, 400);
    }

    await connectMongoDB();

    const checkInInfo: ICheckIn | null = await CheckIn.findOne({ email });

    if (!checkInInfo) {
      return sendSuccessResponse(
        "User has not confirmed his attendance (user email not found in checkIn list)",
        { code: 404 },
        200,
      );
    }

    if (checkInInfo.isCheckedIn) {
      return sendSuccessResponse("User has already checked in to discord.", { code: 409 }, 200);
    } else {
      try {
        await CheckIn.findByIdAndUpdate(
          checkInInfo._id,
          {
            email: checkInInfo.email,
            isCheckedIn: true,
          },
          { new: false },
        );
        return sendSuccessResponse("Successfully checked user in to discord", { code: 200 }, 200);
      } catch (error: any) {
        return sendErrorResponse("Failed to check in user to discord", error, 500);
      }
    }
  } catch (error) {
    console.error("Error checking in user to discord:", error);
    return sendErrorResponse("Something went wrong while checking in user to discord", null, 500);
  }
};

// just to check if the email exists
export const GET = async (req: NextRequest, { params }: { params: Promise<{ email: string }> }) => {
  try {
    const { email } = await params;

    if (!email) {
      return sendErrorResponse("email is required", null, 400);
    }

    await connectMongoDB();

    const checkInInfo: ICheckIn | null = await CheckIn.findOne({ email });

    if (!checkInInfo) {
      return sendSuccessResponse(
        "User has not confirmed his attendance (user email not found in checkIn list)",
        { code: 404 },
        200,
      );
    }
    return sendSuccessResponse("email exists in the discord check-in list", { code: 200 }, 200);
  } catch (error) {
    console.error("Error checking in user to discord:", error);
    return sendErrorResponse("Something went wrong while checking in user to discord", null, 500);
  }
};
