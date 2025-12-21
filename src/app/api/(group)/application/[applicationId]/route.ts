import type { NextRequest } from "next/server";

import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import Application from "@/repository/models/application";
import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";

// Fields that require validation
const REQUIRED_FIELDS = ["firstName", "lastName", "email", "isEighteenOrAbove"];

// Fields that should be stored as strings (not arrays)
const STRING_FIELDS = [
  "firstName",
  "lastName",
  "isEighteenOrAbove",
  "phoneNumber",
  "email",
  "country",
  "city",
  "school",
  "schoolOther",
  "faculty",
  "facultyOther",
  "levelOfStudy",
  "levelOfStudyOther",
  "program",
  "programOther",
  "graduationSemester",
  "graduationYear",
  "coolProject",
  "excitedAbout",
  "preferredLanguage",
  "workingLanguages",
  "workingLanguagesOther",
  "shirtSize",
  "dietaryRestrictionsDescription",
  "github",
  "linkedin",
  "gender",
  "pronouns",
  "underrepresented",
  "jobRolesLookingFor",
  "workRegionsOther",
  "jobTypesInterestedOther",
  "nextCoopTerm",
  "nextCoopTermOther",
  "status",
  "travelReimbursementCurrency",
  "comments",
];

// Fields that should be stored as arrays
const ARRAY_FIELDS = [
  "dietaryRestrictions",
  "workRegions",
  "jobTypesInterested",
  "skillTags",
];

// Fields that store JSON string directly (not in an array wrapper)
const JSON_STRING_FIELDS = ["workingLanguages"];

// All editable fields
const EDITABLE_FIELDS = [
  "firstName",
  "lastName",
  "isEighteenOrAbove",
  "phoneNumber",
  // "email" is intentionally excluded - email should not be editable
  "country",
  "city",
  "school",
  "schoolOther",
  "faculty",
  "facultyOther",
  "levelOfStudy",
  "levelOfStudyOther",
  "program",
  "programOther",
  "graduationSemester",
  "graduationYear",
  "coolProject",
  "excitedAbout",
  "travelReimbursement",
  "preferredLanguage",
  "workingLanguages",
  "workingLanguagesOther",
  "shirtSize",
  "dietaryRestrictions",
  "dietaryRestrictionsDescription",
  "github",
  "linkedin",
  "gender",
  "pronouns",
  "underrepresented",
  "jobRolesLookingFor",
  "workRegions",
  "workRegionsOther",
  "jobTypesInterested",
  "jobTypesInterestedOther",
  "isRegisteredForCoop",
  "nextCoopTerm",
  "nextCoopTermOther",
  "status",
  "isTravelReimbursementApproved",
  "travelReimbursementAmount",
  "travelReimbursementCurrency",
  "comments",
  "skillTags",
];

/**
 * GET: Retrieves application details by ID
 */
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) => {
  try {
    const { applicationId } = await params;
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return sendErrorResponse("Unauthorized", null, 401);
    }

    const payload = await verifyAuthToken(token);
    if (!payload) {
      return sendErrorResponse("Unauthorized", null, 401);
    }

    await connectMongoDB();

    const application = await Application.findById(applicationId);
    if (!application) {
      return sendErrorResponse("Application not found", null, 404);
    }

    return sendSuccessResponse(
      "Application retrieved successfully",
      application.toObject(),
      200
    );
  } catch (error) {
    console.error("Error in GET /api/application/[applicationId]:", error);
    return sendErrorResponse("Failed to retrieve application", error, 500);
  }
};

/**
 * PUT: Updates all application fields
 * Allows admins to edit any field of an application
 */
export const PUT = async (
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) => {
  try {
    const { applicationId } = await params;
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return sendErrorResponse("Unauthorized", null, 401);
    }

    const payload = await verifyAuthToken(token);
    if (!payload) {
      return sendErrorResponse("Unauthorized", null, 401);
    }

    const body = await req.json();

    // Validate required fields
    for (const field of REQUIRED_FIELDS) {
      if (
        body[field] === undefined ||
        body[field] === null ||
        body[field] === ""
      ) {
        return sendErrorResponse(`Missing required field: ${field}`, null, 400);
      }
    }

    // Validate email format
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return sendErrorResponse("Invalid email format", null, 400);
    }

    await connectMongoDB();

    // Check if application exists
    const existingApplication = await Application.findById(applicationId);
    if (!existingApplication) {
      return sendErrorResponse("Application not found", null, 404);
    }

    // Build update object with only editable fields
    // Note: email is intentionally not editable to maintain data integrity
    const updateFields: Record<string, any> = {};
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) {
        let value = body[field];

        // Special handling for JSON string fields (stored as JSON string in a String field)
        // e.g., workingLanguages: '["english","french"]'
        if (JSON_STRING_FIELDS.includes(field)) {
          if (Array.isArray(value)) {
            // If it's ['["value1","value2"]'] format, extract the JSON string
            if (
              value.length === 1 &&
              typeof value[0] === "string" &&
              value[0].startsWith("[")
            ) {
              value = value[0]; // Store the JSON string directly
            } else if (value.length === 0) {
              value = "[]";
            } else {
              // Convert array to JSON string
              value = JSON.stringify(value);
            }
          } else if (typeof value !== "string") {
            value =
              value === null || value === undefined
                ? "[]"
                : JSON.stringify([value]);
          }
          // If it's already a string, keep it as-is
        }
        // Normalize string fields - convert arrays to strings if needed
        else if (STRING_FIELDS.includes(field)) {
          if (Array.isArray(value)) {
            // If it's an array, try to extract a single value or join
            if (value.length === 0) {
              value = "";
            } else if (value.length === 1) {
              // Check if the single value is a JSON string
              const singleValue = value[0];
              if (typeof singleValue === "string") {
                // Try to parse if it looks like JSON
                if (
                  singleValue.startsWith("[") ||
                  singleValue.startsWith("{")
                ) {
                  try {
                    const parsed = JSON.parse(singleValue);
                    value = Array.isArray(parsed)
                      ? parsed.join(", ")
                      : String(parsed);
                  } catch {
                    value = singleValue;
                  }
                } else {
                  value = singleValue;
                }
              } else {
                value = String(singleValue);
              }
            } else {
              // Multiple values - join them
              value = value.join(", ");
            }
          } else if (value !== null && typeof value !== "string") {
            value = String(value);
          }
        }

        // Normalize array fields - ensure they are arrays
        if (ARRAY_FIELDS.includes(field)) {
          if (!Array.isArray(value)) {
            if (value === null || value === undefined || value === "") {
              value = [];
            } else if (typeof value === "string") {
              // Try to parse if it looks like JSON array
              if (value.startsWith("[")) {
                try {
                  value = JSON.parse(value);
                } catch {
                  value = [value];
                }
              } else {
                // Split by comma if it's a comma-separated string
                value = value
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean);
              }
            } else {
              value = [value];
            }
          }
        }

        updateFields[field] = value;
      }
    }

    // Update application
    const updatedApplication = await Application.findByIdAndUpdate(
      applicationId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedApplication) {
      return sendErrorResponse("Failed to update application", null, 500);
    }

    return sendSuccessResponse(
      "Application updated successfully",
      updatedApplication.toObject(),
      200
    );
  } catch (error: any) {
    console.error("Error in PUT /api/application/[applicationId]:", error);

    // Handle duplicate key error (MongoDB error code 11000)
    if (error.code === 11000) {
      return sendErrorResponse(
        "A unique field constraint was violated",
        null,
        400
      );
    }

    return sendErrorResponse("Failed to update application", error, 500);
  }
};
