import type { NextRequest } from "next/server";

import User from "@/repository/models/user";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import Meal from "@/repository/models/meal";

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ userId: string }> }) => {
  try {
    const { userId } = await params;

    if (!userId) {
      return sendErrorResponse("userId is not defined", {}, 400);
    }

    await connectMongoDB();

    const meal = await Meal.findById(userId);

    if (!meal) {
      return sendErrorResponse("No matching user found for the provided user ID", {}, 404);
    }

    const body = await req.json();
    const mealNumber = body.mealNumber;

    if (mealNumber == null) {
      return sendErrorResponse("Invalid meal number", { mealNumber }, 404);
    }

    const meals = meal.meals;

    if (!meals) {
      return sendErrorResponse("Meals list not found for this user", { meals }, 404);
    }

    if (meals[mealNumber] == true) {
      return sendErrorResponse("User have already consumed the meal", { consumed: true }, 404);
    }

    meals[mealNumber] = true;

    const updatedUser = await Meal.findByIdAndUpdate(
      userId,
      {
        meals: {
          taken: meals,
        },
      },
      { new: true },
    );

    if (!updatedUser) {
      return sendErrorResponse("Failed to update user meals information", null, 500);
    }

    return sendSuccessResponse("User meals information updated successfully", updatedUser.meals, 200);
  } catch (error) {
    console.error("Error during PUT request:", error);

    return sendErrorResponse("Failed to retrieve user information", error, 500);
  }
};
