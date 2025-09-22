import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import connectMongoDB from "@/repository/mongoose";
import Admin from "@/repository/models/admin";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import { COOKIE_MAX_AGE_SECONDS, COOKIE_NAME, signAuthToken } from "@/lib/auth-token";
import bcrypt from "bcryptjs";

export const POST = async (req: NextRequest) => {
  try {
    const { email, password, remember } = await req.json();

    if (!email || !password) {
      return sendErrorResponse("Email or password missing", null, 400);
    }

    await connectMongoDB();

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return sendErrorResponse("Invalid credentials", null, 401);
    }

    let passwordMatches = false;
    try {
      passwordMatches = await bcrypt.compare(password, admin.password);
    } catch (_err) {
      passwordMatches = false;
    }

    // Legacy fallback: if stored password was plaintext, upgrade to hashed transparently
    if (!passwordMatches) {
      if (admin.password === password) {
        const newHash = await bcrypt.hash(password, 10);
        admin.password = newHash;
        await admin.save();
        passwordMatches = true;
      }
    }

    if (!passwordMatches) {
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
    return sendErrorResponse("Login failed", error, 500);
  }
};
