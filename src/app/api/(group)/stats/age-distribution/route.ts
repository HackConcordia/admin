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
      const searchTerms = search.trim().split(/\s+/).filter(Boolean);

      if (searchTerms.length === 1) {
        // Single word: search in firstName, lastName, or email
        baseQuery.$or = [
          { firstName: { $regex: searchTerms[0], $options: "i" } },
          { lastName: { $regex: searchTerms[0], $options: "i" } },
          { email: { $regex: searchTerms[0], $options: "i" } },
        ];
      } else {
        // Multiple words: could be "firstName lastName" or "lastName firstName"
        // Match all terms against firstName + lastName combination
        baseQuery.$or = [
          // Match email with full search string
          { email: { $regex: search, $options: "i" } },
          // First term matches firstName AND second term matches lastName
          {
            $and: [
              { firstName: { $regex: searchTerms[0], $options: "i" } },
              { lastName: { $regex: searchTerms.slice(1).join(" "), $options: "i" } },
            ],
          },
          // First term matches lastName AND second term matches firstName
          {
            $and: [
              { lastName: { $regex: searchTerms[0], $options: "i" } },
              { firstName: { $regex: searchTerms.slice(1).join(" "), $options: "i" } },
            ],
          },
          // All terms must match somewhere in firstName or lastName
          {
            $and: searchTerms.map((term) => ({
              $or: [
                { firstName: { $regex: term, $options: "i" } },
                { lastName: { $regex: term, $options: "i" } },
              ],
            })),
          },
        ];
      }
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

