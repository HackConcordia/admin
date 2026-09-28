import type { NextRequest } from "next/server";
import mongoose from "mongoose";

import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import connectMongoDB from "@/repository/mongoose";
import Admin from "@/repository/models/admin";
import { hashPassword, validateNewPassword, verifyPassword } from "@/lib/password";
import { fetchIsSuperAdmin, requireAdmin } from "@/lib/require-admin";

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ adminId: string }> }) => {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { adminId } = await params;

  if (!adminId) {
    return sendErrorResponse("Admin ID is required", null, 400);
  }

  if (!mongoose.Types.ObjectId.isValid(adminId)) {
    return sendErrorResponse("Invalid admin id", null, 400);
  }

  if (adminId !== auth.admin.adminId) {
    // Re-check super-admin status against the database rather than trusting the JWT claim: a
    // demoted or deleted super admin's still-valid session must not keep the power to reset
    // another admin's password.
    const isSuperAdmin = await fetchIsSuperAdmin(auth.admin.adminId);
    if (isSuperAdmin === null) {
      return sendErrorResponse("Unauthorized", null, 401);
    }
    if (!isSuperAdmin) {
      return sendErrorResponse("Forbidden", null, 403);
    }
  }

  try {
    const { newPassword, currentPassword } = await req.json();

    const passwordError = validateNewPassword(newPassword);
    if (passwordError) {
      return sendErrorResponse(passwordError, null, 400);
    }

    // If changing own password, require current password verification
    if (adminId === auth.admin.adminId) {
      if (!currentPassword) {
        return sendErrorResponse("Current password is required", null, 400);
      }
    }

    await connectMongoDB();

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return sendErrorResponse("Admin not found", null, 404);
    }

    // If changing own password, verify the current password
    if (adminId === auth.admin.adminId) {
      const isCurrentPasswordValid = await verifyPassword(currentPassword, admin.password);
      if (!isCurrentPasswordValid) {
        return sendErrorResponse("Current password is incorrect", null, 403);
      }
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
