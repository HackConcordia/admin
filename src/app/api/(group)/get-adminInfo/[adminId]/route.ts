import type { NextRequest } from "next/server";

import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import Admin from "@/repository/models/admin";
import { requireAdmin } from "@/lib/require-admin";

export const GET = async (req: NextRequest, { params }: { params: Promise<{ adminId: string }> }) => {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { adminId } = await params;

    if (!adminId) {
      return sendErrorResponse("AdminId is not defined", null, 400);
    }

    if (adminId !== auth.admin.adminId && !auth.admin.isSuperAdmin) {
      return sendErrorResponse("Forbidden", null, 403);
    }

    await connectMongoDB();

    const admin = await Admin.findById(adminId).select("-password");

    if (!admin) {
      return sendErrorResponse("No admin was found with the provided id.", null, 404);
    }

    return sendSuccessResponse("Admin found", admin, 200);
  } catch (error) {
    console.error("Failed to retrieve admin information:", error);
    return sendErrorResponse("Failed to retrieve admin information", null, 500);
  }
};
