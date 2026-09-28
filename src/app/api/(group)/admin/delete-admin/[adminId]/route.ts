import type { NextRequest } from "next/server";
import mongoose from "mongoose";

import Admin from "@/repository/models/admin";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import { requireAdmin } from "@/lib/require-admin";

export const DELETE = async (req: NextRequest, { params }: { params: Promise<{ adminId: string }> }) => {
  const auth = await requireAdmin(req, { superAdmin: true });
  if (!auth.ok) return auth.response;

  const { adminId } = await params;

  if (!adminId) {
    return sendErrorResponse("AdminId is not defined", null, 400);
  }

  if (!mongoose.Types.ObjectId.isValid(adminId)) {
    return sendErrorResponse("Invalid admin id", null, 400);
  }

  if (adminId === auth.admin.adminId) {
    return sendErrorResponse("You cannot delete your own account", null, 400);
  }

  try {
    await connectMongoDB();

    const deletedAdmin = await Admin.findByIdAndDelete(adminId);

    if (!deletedAdmin) {
      return sendErrorResponse("Admin not found", null, 404);
    }

    return sendSuccessResponse(
      "Admin deleted successfully",
      { _id: String(deletedAdmin._id), email: deletedAdmin.email },
      200,
    );
  } catch (error) {
    console.error("Failed to delete admin:", error);
    return sendErrorResponse("Failed to delete admin", null, 500);
  }
};
