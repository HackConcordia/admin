import connectMongoDB from "@/repository/mongoose";
import { sendSuccessResponse, sendErrorResponse } from "@/repository/response";
import Application from "@/repository/models/application";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = async (request: Request) => {
  try {
    await connectMongoDB();

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all"; // "all", "above", "below"
    const search = searchParams.get("search") || "";

    // Base query: only Confirmed and Checked-in applications
    const baseQuery: Record<string, unknown> = {
      status: { $in: ["Confirmed", "Checked-in"] },
    };

    // Add age filter
    if (filter === "above") {
      baseQuery.isEighteenOrAbove = "yes";
    } else if (filter === "below") {
      baseQuery.isEighteenOrAbove = "no";
    }

    // Add search filter (search by name or email)
    if (search) {
      baseQuery.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const applications = await Application.find(baseQuery, {
      _id: 1,
      firstName: 1,
      lastName: 1,
      email: 1,
      isEighteenOrAbove: 1,
      status: 1,
      school: 1,
    })
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    return sendSuccessResponse(
      "Age distribution applicants retrieved successfully",
      applications
    );
  } catch (error) {
    console.error("Error during GET request:", error);
    return sendErrorResponse(
      "Failed to retrieve age distribution applicants",
      error,
      500
    );
  }
};

