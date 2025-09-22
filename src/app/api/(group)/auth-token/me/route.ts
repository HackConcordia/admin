import type { NextRequest } from "next/server";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
import connectMongoDB from "@/repository/mongoose";
import Admin from "@/repository/models/admin";

export const GET = async (req: NextRequest) => {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return sendErrorResponse("Unauthorized", null, 401);

  const payload = await verifyAuthToken(token);
  if (!payload) return sendErrorResponse("Unauthorized", null, 401);

  try {
    await connectMongoDB();
    const admin = await Admin.findById(payload.adminId).select(
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
    return sendErrorResponse("Failed to fetch current admin", error, 500);
  }
};
