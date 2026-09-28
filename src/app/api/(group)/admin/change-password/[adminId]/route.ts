import type { NextRequest } from "next/server";

import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import connectMongoDB from "@/repository/mongoose";
import Admin from "@/repository/models/admin";
import { hashPassword, validateNewPassword, verifyPassword } from "@/lib/password";
import { requireAdmin } from "@/lib/require-admin";

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ adminId: string }> }) => {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { adminId } = await params;

  if (!adminId) {
    return sendErrorResponse("Admin ID is required", null, 400);
  }

  if (adminId !== auth.admin.adminId && !auth.admin.isSuperAdmin) {
    return sendErrorResponse("Forbidden", null, 403);
  }

  try {
    const { newPassword } = await req.json();

    const passwordError = validateNewPassword(newPassword);
    if (passwordError) {
      return sendErrorResponse(passwordError, null, 400);
    }

    await connectMongoDB();

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return sendErrorResponse("Admin not found", null, 404);
    }

    if (await verifyPassword(newPassword, admin.password)) {
      return sendErrorResponse("New password cannot be the same as the old password", null, 400);
    }

    await Admin.updateOne({ _id: adminId }, { $set: { password: await hashPassword(newPassword) } });

    return sendSuccessResponse("Password updated successfully", null, 200);
  } catch (error) {
    console.error("Failed to update password:", error);
    return sendErrorResponse("Failed to update password", null, 500);
  }
};
