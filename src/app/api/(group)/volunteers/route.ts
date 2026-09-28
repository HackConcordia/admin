import type { NextRequest } from "next/server";

import connectMongoDB from "@/repository/mongoose";
import Volunteer from "@/repository/models/volunteer";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import type { IVolunteerCredentials } from "@/interfaces/IVolunteer";
import { hashPassword } from "@/lib/password";
import { requireAdmin } from "@/lib/require-admin";
import { generateVolunteerPassword } from "@/lib/volunteer-password";
import {
  CASE_INSENSITIVE_COLLATION,
  describeError,
  parseNewVolunteer,
  toVolunteerListItem,
  type VolunteerRecord,
} from "@/lib/volunteers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DUPLICATE_KEY_ERROR = 11000;

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === DUPLICATE_KEY_ERROR;
}

export const GET = async (req: NextRequest) => {
  const auth = await requireAdmin(req, { superAdmin: true });
  if (!auth.ok) return auth.response;

  try {
    await connectMongoDB();

    // The password is read only to compute needsPasswordReset; toVolunteerListItem drops it.
    const records = await Volunteer.find({})
      .select("firstName lastName email password")
      .collation(CASE_INSENSITIVE_COLLATION)
      .sort({ firstName: 1, lastName: 1 })
      .lean<VolunteerRecord[]>();

    const response = sendSuccessResponse("Volunteers found", records.map(toVolunteerListItem), 200);
    response.headers.set("Cache-Control", "no-store");

    return response;
  } catch (error) {
    console.error("Failed to fetch volunteers:", describeError(error));
    return sendErrorResponse("Failed to fetch volunteers", null, 500);
  }
};

export const POST = async (req: NextRequest) => {
  const auth = await requireAdmin(req, { superAdmin: true });
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return sendErrorResponse("Request body must be valid JSON", null, 400);
  }

  const parsed = parseNewVolunteer(body);
  if (!parsed.ok) {
    return sendErrorResponse(parsed.error, null, 400);
  }

  const { firstName, lastName, email } = parsed.value;

  try {
    await connectMongoDB();

    // Case-insensitive, like event-checkin's login lookup: legacy volunteers may be stored with
    // mixed-case emails, and event-checkin's unique index on `email` is case-sensitive.
    const existing = await Volunteer.findOne({ email }).collation(CASE_INSENSITIVE_COLLATION).select("_id").lean();
    if (existing) {
      return sendErrorResponse("A volunteer with this email already exists", null, 409);
    }

    const generatedPassword = generateVolunteerPassword();
    const created = await Volunteer.create({
      firstName,
      lastName,
      email,
      password: await hashPassword(generatedPassword),
      isSuperAdmin: false,
    });

    // The only response that ever carries this password. It is not stored or logged anywhere.
    const credentials: IVolunteerCredentials = { ...toVolunteerListItem(created), generatedPassword };
    const response = sendSuccessResponse("Volunteer created successfully", credentials, 200);
    response.headers.set("Cache-Control", "no-store");

    return response;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return sendErrorResponse("A volunteer with this email already exists", null, 409);
    }

    console.error("Failed to create volunteer:", describeError(error));
    return sendErrorResponse("Failed to create volunteer", null, 500);
  }
};
