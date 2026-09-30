import type { NextRequest } from "next/server";

import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import Admin from "@/repository/models/admin";
import { hashPassword, validateNewPassword } from "@/lib/password";
import { requireAdmin } from "@/lib/require-admin";
import { escapeRegex } from "@/lib/conuhacks/application-query";

export const POST = async (req: NextRequest) => {
  const auth = await requireAdmin(req, { superAdmin: true });
  if (!auth.ok) return auth.response;

  try {
    const { firstName, lastName, email, password } = await req.json();

    if (!firstName || !lastName || !email || !password) {
      return sendErrorResponse("First name, last name, email and password are required", null, 400);
    }

    const passwordError = validateNewPassword(password);
    if (passwordError) {
      return sendErrorResponse(passwordError, null, 400);
    }

    await connectMongoDB();

    // Same normalization as login and the seed script: trimmed, lowercased, matched whole and case-insensitively.
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await Admin.findOne({ email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: "i" } });
    if (existing) {
      return sendErrorResponse("An admin with this email already exists", null, 409);
    }

    const newAdmin = await Admin.create({
      firstName: String(firstName),
      lastName: String(lastName),
      email: normalizedEmail,
      password: await hashPassword(password),
    });

    return sendSuccessResponse(
      "Admin created successfully",
      {
        _id: String(newAdmin._id),
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
        email: newAdmin.email,
        isSuperAdmin: Boolean(newAdmin.isSuperAdmin),
      },
      200,
    );
  } catch (error) {
    console.error("Failed to create admin:", error);
    return sendErrorResponse("Failed to create admin", null, 500);
  }
};
