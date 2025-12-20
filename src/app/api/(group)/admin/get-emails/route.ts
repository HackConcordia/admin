import type { NextRequest } from "next/server";

import connectMongoDB from "@/repository/mongoose";
import Admin from "@/repository/models/admin";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = async (req: NextRequest) => {
  try {
    await connectMongoDB();

    const admins = await Admin.find({ isSuperAdmin: false }).select("email -_id").lean();

    const adminEmails = admins.map((admin) => admin.email);

    if (!adminEmails) {
      return sendErrorResponse("No admins were found", null, 404);
    }

    const response = sendSuccessResponse("Admins found", adminEmails, 200);
    response.headers.set("Cache-Control", "no-store");

    return response;
  } catch (error) {
    return sendErrorResponse("Failed to fetch admins", error, 500);
  }
};
