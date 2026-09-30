import type { NextRequest } from "next/server";

import connectMongoDB from "@/repository/mongoose";
import Admin from "@/repository/models/admin";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import { COOKIE_MAX_AGE_SECONDS, COOKIE_NAME, signAuthToken } from "@/lib/auth-token";
import { escapeRegex } from "@/lib/conuhacks/application-query";
import { DUMMY_BCRYPT_HASH, isBcryptHash, verifyPassword } from "@/lib/password";

export const POST = async (req: NextRequest) => {
  try {
    const { email, password, remember } = await req.json();

    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return sendErrorResponse("Email or password missing", null, 400);
    }

    await connectMongoDB();

    // The seed script lowercases emails, but older admins may be stored mixed-case: match the
    // whole address case-insensitively (anchored and escaped, so no other pattern gets through).
    const normalizedEmail = email.trim().toLowerCase();
    const admin = await Admin.findOne({ email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: "i" } });
    const stored = admin && isBcryptHash(admin.password) ? admin.password : DUMMY_BCRYPT_HASH;
    const passwordMatches = await verifyPassword(password, stored);

    if (!admin || !passwordMatches) {
      return sendErrorResponse("Invalid credentials", null, 401);
    }

    const token = await signAuthToken(
      { adminId: String(admin._id), email: admin.email, isSuperAdmin: !!admin.isSuperAdmin },
      !!remember,
    );

    const res = sendSuccessResponse("Logged in successfully", { ok: true }, 200);
    res.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: remember ? COOKIE_MAX_AGE_SECONDS : undefined,
    });

    return res;
  } catch (error) {
    console.error("Login failed:", error instanceof Error ? error.message : "unknown error");
    return sendErrorResponse("Login failed", null, 500);
  }
};
