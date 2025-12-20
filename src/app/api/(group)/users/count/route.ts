import { sendSuccessResponse, sendErrorResponse } from "@/repository/response";
import User from "@/repository/models/user";
import connectMongoDB from "@/repository/mongoose";
import type { Count } from "@/interfaces/count";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = async (req: Request) => {
  try {
    await connectMongoDB();

    const stats: Count = {
      status: {
        total: await User.countDocuments(),
        unverified: await User.countDocuments({ status: "Unverified" }),
        verified: await User.countDocuments({ status: "Incomplete" }),
        submitted: await User.countDocuments({ status: "Submitted" }),
        admitted: await User.countDocuments({ status: "Admitted" }),
        waitlisted: await User.countDocuments({ status: "Waitlisted" }),

        // const notConfirmed = await User.countDocuments({status: "admitted",confirmed:false})
        confirmed: await User.countDocuments({ status: "Confirmed" }),
        declined: await User.countDocuments({ status: "Declined" }),
        checkedIn: await User.countDocuments({ status: "CheckedIn" }),
      },
      shirtSize: {
        smallShirt: await User.countDocuments({ "confirmation.shirtSize": "S" }),
        mediumShirt: await User.countDocuments({ "confirmation.shirtSize": "M" }),
        largeShirt: await User.countDocuments({ "confirmation.shirtSize": "L" }),
        xlargeShirt: await User.countDocuments({ "confirmation.shirtSize": "XL" }),
        xxlargeShirt: await User.countDocuments({ "confirmation.shirtSize": "XXL" }),
      },
      dietaryRestrictions: {
        vegetarian: await User.countDocuments({
          "confirmation.dietaryRestrictions": { $elemMatch: { $eq: "vegetarian" } },
        }),
        vegan: await User.countDocuments({
          "confirmation.dietaryRestrictions": { $elemMatch: { $eq: "vegan" } },
        }),
        glutenFree: await User.countDocuments({
          "confirmation.dietaryRestrictions": { $elemMatch: { $eq: "glutenFree" } },
        }),
        halal: await User.countDocuments({
          "confirmation.dietaryRestrictions": { $elemMatch: { $eq: "halal" } },
        }),
        kosher: await User.countDocuments({
          "confirmation.dietaryRestrictions": { $elemMatch: { $eq: "kosher" } },
        }),
        nutAllergy: await User.countDocuments({
          "confirmation.dietaryRestrictions": { $elemMatch: { $eq: "nutAllergy" } },
        }),
        dairyFree: await User.countDocuments({
          "confirmation.dietaryRestrictions": { $elemMatch: { $eq: "dairyFree" } },
        }),
        other: await User.countDocuments({
          "confirmation.dietaryRestrictions": { $elemMatch: { $eq: "other" } },
        }),
      },
    }; // users count for each status

    // users count for shirt size

    const response = sendSuccessResponse("Successfully fetched users count", stats, 200);

    response.headers.set("Cache-Control", "no-store");

    return response;
  } catch (error) {
    return sendErrorResponse("Failed to fetch users count", error, 404);
  }
};
