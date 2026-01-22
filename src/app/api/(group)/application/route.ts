import type { NextRequest } from "next/server";

import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import Application from "@/repository/models/application";
import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";

// Fields that require validation
const REQUIRED_FIELDS = ["firstName", "lastName", "email", "isEighteenOrAbove"];

// Fields that should be stored as strings
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

// Fields that store JSON string directly
const JSON_STRING_FIELDS = ["workingLanguages"];

const ALL_FIELDS = [
  ...STRING_FIELDS,
  ...ARRAY_FIELDS,
  "travelReimbursement",
  "isRegisteredForCoop",
  "isTravelReimbursementApproved",
  "travelReimbursementAmount",
  "teamId",
  "termsAndConditions",
];

/**
 * POST: Create a new application
 */
export const POST = async (req: NextRequest) => {
  try {
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
      if (!body[field]) {
        return sendErrorResponse(`Missing required field: ${field}`, null, 400);
      }
    }

    // Validate email format
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return sendErrorResponse("Invalid email format", null, 400);
    }

    await connectMongoDB();

    // Check if email already exists
    const existing = await Application.findOne({ email: body.email });
    if (existing) {
      return sendErrorResponse(
        "An application with this email already exists",
        null,
        400,
      );
    }

    // Build creation object with normalization logic (reused from [applicationId]/route.ts)
    const applicationData: Record<string, any> = {};
    for (const field of ALL_FIELDS) {
      if (body[field] !== undefined) {
        let value = body[field];

        // Normalization logic identical to PUT handler for consistency
        if (JSON_STRING_FIELDS.includes(field)) {
          if (Array.isArray(value)) {
            value = JSON.stringify(value);
          } else if (typeof value !== "string") {
            value =
              value === null || value === undefined
                ? "[]"
                : JSON.stringify([value]);
          }
        } else if (STRING_FIELDS.includes(field)) {
          if (Array.isArray(value)) {
            value = value.length === 0 ? "" : value.join(", ");
          } else if (value !== null && typeof value !== "string") {
            value = String(value);
          }
        } else if (ARRAY_FIELDS.includes(field)) {
          if (!Array.isArray(value)) {
            if (value === null || value === undefined || value === "") {
              value = [];
            } else if (typeof value === "string") {
              if (value.startsWith("[")) {
                try {
                  value = JSON.parse(value);
                } catch {
                  value = [value];
                }
              } else {
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
        applicationData[field] = value;
      }
    }

    const newApplication = new Application(applicationData);
    await newApplication.save();

    return sendSuccessResponse(
      "Application created successfully",
      newApplication.toObject(),
      201,
    );
  } catch (error: any) {
    console.error("Error in POST /api/application:", error);
    if (error.code === 11000) {
      return sendErrorResponse(
        "An application with this email already exists",
        null,
        400,
      );
    }
    return sendErrorResponse("Failed to create application", error, 500);
  }
};
