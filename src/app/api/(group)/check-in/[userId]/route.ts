import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import Application from "@/repository/models/application";
import Meal from "@/repository/models/meal";
import QrCodeMapping from "@/repository/models/qrcodemapping";
import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
import mongoose from "mongoose";

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ userId: string }> }) => {
  try {
    const { userId } = await params;
    const { status, qrCodeNumber, eventId } = await req.json();

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

    // Validate QR code number if provided
    if (qrCodeNumber !== undefined) {
      if (!Number.isInteger(qrCodeNumber) || qrCodeNumber <= 0) {
        return sendErrorResponse("QR code number must be a positive integer", null, 400);
      }

      // Get eventId from request body, environment variable, or use default
      const defaultEventId = "6964c0a037ee55cd2e05d1c3";
      const finalEventId = eventId || process.env.EVENT_ID || defaultEventId;

      // Validate eventId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(finalEventId)) {
        return sendErrorResponse("Invalid Event ID format", null, 400);
      }

      // Check if QR code number is already used
      const existingMapping = await QrCodeMapping.findOne({ qrCodeNumber });
      if (existingMapping) {
        return sendErrorResponse(
          `QR code number ${qrCodeNumber} is already assigned to another application`,
          null,
          400
        );
      }

      // Get admin email from auth token for checkedInBy
      let checkedInBy = "system";
      try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;
        if (token) {
          const payload = await verifyAuthToken(token);
          if (payload?.email) {
            checkedInBy = payload.email;
          } else {
            console.warn("Auth token payload does not contain email");
          }
        } else {
          console.warn("No auth token found in cookies");
        }
      } catch (error) {
        // If we can't get the admin email, use "system" as fallback
        console.error("Could not get admin email from auth token:", error);
      }

      // Create QR code mapping
      const qrCodeMapping = new QrCodeMapping({
        qrCodeNumber,
        applicationId: userId,
        eventId: finalEventId,
        checkedInAt: new Date(),
        checkedInBy,
      });
      await qrCodeMapping.save();
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
