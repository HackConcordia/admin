import type { NextRequest } from "next/server";

import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import Application from "@/repository/models/application";
import Meal from "@/repository/models/meal";

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ userId: string }> }) => {
  try {
    const { userId } = await params;
    const { status } = await req.json();

    if (!status) {
      return sendErrorResponse("Status is required", null, 400);
    }

    if (!userId) {
      return sendErrorResponse("User ID is required", null, 400);
    }

    await connectMongoDB();

    const application = await Application.findById(userId);
    if (!application) {
      return sendErrorResponse("Application not found", null, 404);
    }

    if (application.status === "Checked-in") {
      return sendErrorResponse("User is already checked-in", null, 500);
    } else if (application.status !== "Confirmed") {
      return sendErrorResponse("User is not confirmed", null, 500);
    }

    // Update user's status to 'Checked-in'
    await Application.findByIdAndUpdate(userId, { $set: { status: "Checked-in" } });

    // Add user to meals collection if not already present
    const existingMeal = await Meal.findOne({ _id: userId }); // Now searching by userId as _id
    if (!existingMeal) {
      // If the user doesn't exist in the meals collection, add them
      const newMealRecord = new Meal({
        _id: userId, // Setting _id to userId
        name: application.firstName + " " + application.lastName,
        email: application.email,
        meals: [
          { date: new Date("2026-01-24"), type: "breakfast", taken: false },
          { date: new Date("2026-01-24"), type: "lunch", taken: false },
          { date: new Date("2026-01-24"), type: "snacks", taken: false },
          { date: new Date("2026-01-24"), type: "dinner", taken: false },
          { date: new Date("2026-01-25"), type: "breakfast", taken: false },
          { date: new Date("2026-01-25"), type: "lunch", taken: false },
        ],
      });
      await newMealRecord.save();
    }

    return sendSuccessResponse("Attendance confirmed and meals record created", { status: "Checked-in" }, 200);
  } catch (error) {
    console.error("Error confirming attendance:", error);
    return sendErrorResponse("Something went wrong while confirming attendance", null, 500);
  }
};
