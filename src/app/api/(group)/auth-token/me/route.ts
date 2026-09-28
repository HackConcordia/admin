import type { NextRequest } from "next/server";

import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import connectMongoDB from "@/repository/mongoose";
import Admin from "@/repository/models/admin";
import { requireAdmin } from "@/lib/require-admin";

export const GET = async (req: NextRequest) => {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    await connectMongoDB();
    const admin = await Admin.findById(auth.admin.adminId).select(
      "firstName lastName email isSuperAdmin assignedApplications",
    );
    if (!admin) return sendErrorResponse("Admin not found", null, 404);

    return sendSuccessResponse(
      "Current admin",
      {
        _id: String(admin._id),
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        isSuperAdmin: !!admin.isSuperAdmin,
        assignedApplications: admin.assignedApplications || [],
      },
      200,
    );
  } catch (error) {
    console.error("Failed to fetch current admin:", error);
    return sendErrorResponse("Failed to fetch current admin", null, 500);
  }
};
