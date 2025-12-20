import type { NextRequest } from "next/server";

import Admin from "@/repository/models/admin";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";

export const DELETE = async (req: NextRequest, { params }: { params: Promise<{ adminId: string }> }) => {
  const { adminId } = await params;

  if (!adminId) {
    return sendErrorResponse("AdminId is not defined", null, 400);
  }

  try {
    await connectMongoDB();

    const deletedAdmin = await Admin.findByIdAndDelete(adminId);

    if (!deletedAdmin) {
      return sendErrorResponse("Admin not found", null, 404);
    }

    return sendSuccessResponse("Admin deleted successfully", deletedAdmin, 200);
  } catch (error) {
    return sendErrorResponse("Failed to delete admin", error, 500);
  }
};
