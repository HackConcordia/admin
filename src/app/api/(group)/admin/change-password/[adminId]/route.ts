import type { NextRequest } from "next/server";

import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import connectMongoDB from "@/repository/mongoose";
import Admin from "@/repository/models/admin";

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ adminId: string }> }) => {
  const { adminId } = await params;

  if (!adminId) {
    return sendErrorResponse("Admin ID is required", null, 400);
  }

  const { newPassword } = await req.json();

  try {
    await connectMongoDB();

    const admin = await Admin.findOne({ _id: adminId });

    if (!admin) {
      return sendErrorResponse("Admin not found", null, 404);
    }

    if (admin.password === newPassword) {
      return sendErrorResponse("New password cannot be the same as the old password", null, 400);
    }

    admin.password = newPassword;

    await admin.save();

    return sendSuccessResponse("Password updated successfully", admin, 200);
  } catch (error) {
    return sendErrorResponse("Failed to update password", error, 500);
  }
};
