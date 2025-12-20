import type { NextRequest } from "next/server";

import mongoose from "mongoose";

import Meal from "@/repository/models/meal";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) => {
  try {
    const { userId } = await params;

    if (!userId) {
      return sendErrorResponse("userId is not defined", {}, 400);
    }

    await connectMongoDB();

    const { mealData } = await req.json();

    if (!mealData || !Array.isArray(mealData)) {
      return sendErrorResponse("Invalid mealData format", {}, 400);
    }

    console.log("userId:", userId);

    // Ensure the id is converted to ObjectId if it's a string
    const mealDocumentId = new mongoose.Types.ObjectId(userId);

    // Fetch the current meal data to update it based on checkbox selection
    const userMeal = await Meal.findOne({ _id: mealDocumentId });

    if (!userMeal) {
      return sendErrorResponse("Meal record not found for this user", {}, 404);
    }

    // Update meals for the user based on the provided mealData
    const updatedMeals = userMeal.meals.map(
      (meal: { date: string | number | Date; type: any }) => {
        const updatedMeal = mealData.find(
          (newMeal: { date: string | number | Date; type: any }) =>
            new Date(newMeal.date).toDateString() ===
              new Date(meal.date).toDateString() && newMeal.type === meal.type
        );

        if (updatedMeal) {
          return { ...meal, taken: updatedMeal.taken };
        }

        return meal;
      }
    );

    // Update the meal document in the database
    userMeal.meals = updatedMeals;
    await userMeal.save();

    return sendSuccessResponse(
      "User meals information updated successfully",
      userMeal,
      200
    );
  } catch (error) {
    console.error("Error updating meal:", error);
    return sendErrorResponse("Failed to update meal", error, 500);
  }
};
