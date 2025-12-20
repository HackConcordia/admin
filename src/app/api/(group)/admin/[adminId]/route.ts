import type { NextRequest } from "next/server";

import connectMongoDB from "@/repository/mongoose";
import { sendSuccessResponse, sendErrorResponse } from "@/repository/response";
import User from "@/repository/models/user";
import type { IUser } from "@/interfaces/IUser";

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ adminId: string }> }) => {
  try {
    const { adminId } = await params;

    if (!adminId) {
      return sendErrorResponse("AdminId is not defined", null, 400);
    }

    await connectMongoDB();

    const admin: IUser | null = await User.findOne({
      _id: adminId,
      admin: true,
    });

    if (!admin) {
      return sendErrorResponse("No admin was found with the provided id.", null, 400);
    }

    const { userId, status } = await req.json();

    if (!userId || !status) {
      return sendErrorResponse("Either userId, or status is not present in the body", null, 400);
    }

    const user = await User.findById(userId);

    if (!user) {
      return sendErrorResponse("User to be updated not found.", null, 400);
    }

    let updatedUser = null;

    switch (status) {
      case "Admitted":
        if (user.status != "Submitted") {
          return sendErrorResponse("Cannot admit a user who haven't submitted an application yet", null, 400);
        } else {
          updatedUser = await User.findByIdAndUpdate(
            userId,
            {
              status,
              statusHistory: {
                admitted: {
                  on: Date.now(),
                  by: {
                    id: adminId,
                    name: admin.firstName + " " + admin.lastName[0],
                  },
                },
              },
            },
            { new: true },
          );
        }

        break;

      case "Rejected":
        if (user.status != "Submitted") {
          return sendErrorResponse("Cannot reject a user who haven't submitted an application yet", null, 400);
        } else {
          updatedUser = await User.findByIdAndUpdate(
            userId,
            {
              status,
              statusHistory: {
                rejected: {
                  on: Date.now(),
                  by: {
                    id: adminId,
                    name: admin.firstName + " " + admin.lastName[0],
                  },
                },
              },
            },
            { new: true },
          );
        }

        break;
      case "CheckedIn":
        if (user.status != "Confirmed") {
          return sendErrorResponse("Cannot checkIn a user who haven't confirmed his participation", null, 400);
        } else {
          updatedUser = await User.findByIdAndUpdate(
            userId,
            {
              status,
              statusHistory: {
                checkedIn: {
                  on: Date.now(),
                  by: {
                    id: adminId,
                    name: admin.firstName + " " + admin.lastName[0],
                  },
                },
              },
            },
            { new: true },
          );
        }

        break;
      default:
        return sendErrorResponse("Invalid status type action: " + status, null, 400);
    }

    if (!updatedUser) {
      return sendErrorResponse("Failed to update the user", null, 500);
    }

    console.log("HERE");

    return sendSuccessResponse("Successfully updated user status", updatedUser, 200);
  } catch (error) {
    console.log("error");

    return sendErrorResponse("Internal server error", error, 500);
  }
};
