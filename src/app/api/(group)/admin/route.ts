import type { NextRequest } from "next/server";

import connectMongoDB from "@/repository/mongoose";
import Admin from "@/repository/models/admin";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = async (req: NextRequest) => {
  try {
    await connectMongoDB();

    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const search = searchParams.get("search") || "";

    // Build match query for search
    const matchQuery: any = { isSuperAdmin: false };
    if (search) {
      matchQuery.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * pageSize;

    // Get total count for pagination metadata
    const totalRecords = await Admin.countDocuments(matchQuery);
    const totalPages = Math.ceil(totalRecords / pageSize);

    // Fetch paginated admins
    const admins = await Admin.find(matchQuery)
      .select("firstName lastName email password")
      .skip(skip)
      .limit(pageSize)
      .lean();

    const response = sendSuccessResponse(
      "Admins found",
      {
        data: admins,
        pagination: {
          page,
          pageSize,
          totalRecords,
          totalPages,
        },
      },
      200,
    );
    response.headers.set("Cache-Control", "no-store");

    return response;
  } catch (error) {
    return sendErrorResponse("Failed to fetch admins", error, 500);
  }
};
