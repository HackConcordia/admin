import connectMongoDB from "@/repository/mongoose";
import { sendSuccessResponse, sendErrorResponse } from "@/repository/response";
import Application from "@/repository/models/application";
import { escapeRegex } from "@/lib/conuhacks/application-query";
import { AGE_VALUES } from "@/lib/conuhacks/field-options";
import { requireAdmin } from "@/lib/require-admin";
import { CHECKED_IN_STATUSES } from "@/lib/status";
import { describeError } from "@/lib/volunteers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = async (request: Request) => {
  // Age is a super-admin-only field; this list exists for consent-form follow-up.
  const auth = await requireAdmin(request, { superAdmin: true });
  if (!auth.ok) return auth.response;

  try {
    await connectMongoDB();

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all"; // "all", "above", "below"
    const search = searchParams.get("search") || "";

    // Base query: only Confirmed and Checked-in applications
    const baseQuery: Record<string, unknown> = {
      status: { $in: ["Confirmed", ...CHECKED_IN_STATUSES] },
    };

    // Add age filter
    // Age on the first day of the event, from the XI "age" bucket.
    if (filter === "above") {
      baseQuery.age = { $in: AGE_VALUES.filter((value) => value !== "under-18") };
    } else if (filter === "below") {
      baseQuery.age = "under-18";
    }

    // Add search filter (search by name or email)
    if (search) {
      const searchTerms = search.trim().split(/\s+/).filter(Boolean);

      if (searchTerms.length === 1) {
        // Single word: search in firstName, lastName, or email
        baseQuery.$or = [
          { firstName: { $regex: escapeRegex(searchTerms[0]), $options: "i" } },
          { lastName: { $regex: escapeRegex(searchTerms[0]), $options: "i" } },
          { email: { $regex: escapeRegex(searchTerms[0]), $options: "i" } },
        ];
      } else {
        // Multiple words: could be "firstName lastName" or "lastName firstName"
        // Match all terms against firstName + lastName combination
        baseQuery.$or = [
          // Match email with full search string
          { email: { $regex: escapeRegex(search), $options: "i" } },
          // First term matches firstName AND second term matches lastName
          {
            $and: [
              { firstName: { $regex: escapeRegex(searchTerms[0]), $options: "i" } },
              { lastName: { $regex: escapeRegex(searchTerms.slice(1).join(" ")), $options: "i" } },
            ],
          },
          // First term matches lastName AND second term matches firstName
          {
            $and: [
              { lastName: { $regex: escapeRegex(searchTerms[0]), $options: "i" } },
              { firstName: { $regex: escapeRegex(searchTerms.slice(1).join(" ")), $options: "i" } },
            ],
          },
          // All terms must match somewhere in firstName or lastName
          {
            $and: searchTerms.map((term) => ({
              $or: [
                { firstName: { $regex: escapeRegex(term), $options: "i" } },
                { lastName: { $regex: escapeRegex(term), $options: "i" } },
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
      age: 1,
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
    console.error("Error during GET request:", describeError(error));
    return sendErrorResponse("Failed to retrieve age distribution applicants", null, 500);
  }
};

