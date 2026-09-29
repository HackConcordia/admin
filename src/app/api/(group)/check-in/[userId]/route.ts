import type { NextRequest } from "next/server";

import { getEventConfig, type EventConfig } from "@/config/event";
import { buildMealRecords } from "@/lib/conuhacks/meals";
import { requireAdmin } from "@/lib/require-admin";
import { CHECKED_IN_STATUS, isCheckedInStatus } from "@/lib/status";
import Application from "@/repository/models/application";
import Meal from "@/repository/models/meal";
import QrCodeMapping from "@/repository/models/qrcodemapping";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";

const DUPLICATE_KEY_ERROR = 11000;

type Release = () => Promise<void>;

type BadgeClaim = { ok: true; release: Release } | { ok: false; message: string };

interface BadgeMapping {
  _id: unknown;
  applicationId?: unknown;
  checkedInAt?: Date | null;
}

interface CheckInApplicant {
  firstName?: string;
  lastName?: string;
  email?: string;
}

// A Mongo error message can carry applicant data (a duplicate-key error quotes the key value,
// e.g. an email), so only the error's class and code are logged, never its message.
function describeError(error: unknown): string {
  const name = error instanceof Error ? error.name : "unknown error";
  const code = (error as { code?: unknown } | null)?.code;
  return code === undefined ? name : `${name} code=${String(code)}`;
}

function isBadgeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

const BADGE_ALREADY_USED = "This badge has already been used for check-in";

// Mirrors event-checkin's claimBadge: a badge belongs to one applicant, and the applicant's own
// unused mapping for this event (e.g. from an earlier failed attempt) is reused. Returns how to
// undo the claim if the check-in itself then fails.
async function claimBadge(qrCodeNumber: number, userId: string, eventId: string, checkedInBy: string): Promise<BadgeClaim> {
  const existing = (await QrCodeMapping.findOne({ qrCodeNumber, eventId })) as BadgeMapping | null;

  if (existing) {
    if (String(existing.applicationId).toLowerCase() !== userId.toLowerCase()) {
      return { ok: false, message: `QR code number ${qrCodeNumber} is already assigned to another application` };
    }
    if (existing.checkedInAt) return { ok: false, message: BADGE_ALREADY_USED };

    // Conditional on checkedInAt still being null: two concurrent claims can't both win.
    const claimedAt = new Date();
    const claimed = await QrCodeMapping.updateOne(
      { _id: existing._id, checkedInAt: null },
      { $set: { checkedInAt: claimedAt, checkedInBy } },
    );
    if (claimed.modifiedCount === 0) return { ok: false, message: BADGE_ALREADY_USED };

    return {
      ok: true,
      // Only undo the claim if it's still ours: a loser's release must not clobber a winner's claim.
      release: async () => {
        await QrCodeMapping.updateOne({ _id: existing._id, checkedInAt: claimedAt }, { $set: { checkedInAt: null } });
      },
    };
  }

  try {
    const created = await QrCodeMapping.create({
      qrCodeNumber,
      applicationId: userId,
      eventId,
      checkedInAt: new Date(),
      checkedInBy,
    });
    return {
      ok: true,
      release: async () => {
        await QrCodeMapping.deleteOne({ _id: created._id });
      },
    };
  } catch (error) {
    // qrCodeNumber is unique (event-checkin owns the index): a badge claimed a moment ago by a
    // volunteer or another organizer fails with E11000, answered as a 409 rather than a 500.
    if ((error as { code?: unknown } | null)?.code === DUPLICATE_KEY_ERROR) return { ok: false, message: "Badge already assigned" };
    throw error;
  }
}

async function releaseBadge(release: Release): Promise<void> {
  try {
    await release();
  } catch (error) {
    console.error("Failed to release a badge after a failed check-in:", describeError(error));
  }
}

// The applicant is already checked in when this runs: a missing meal record must not turn that
// into an error. Deduplicated by email like event-checkin (meals.email is unique).
async function seedMeals(userId: string, applicant: CheckInApplicant, config: EventConfig): Promise<void> {
  if (config.meals.length === 0) return;
  try {
    if (await Meal.exists({ email: applicant.email })) return;
    await Meal.create({
      _id: userId,
      name: `${applicant.firstName} ${applicant.lastName}`,
      email: applicant.email,
      meals: buildMealRecords(config.meals),
    });
  } catch (error) {
    console.error("Failed to create the meal record after a check-in:", describeError(error));
  }
}

/**
 * Organizer fallback for event-day check-in (volunteers use event-checkin, roadmap decision 1).
 * Writes the same data as event-checkin: the physical badge number in qrcodemappings under this
 * deployment's EVENT_ID, status "Checked-in" (C4), and a meal record built from EVENT_MEALS (C5).
 * Race-safe like event-checkin's claimBadge: a duplicate badge is a 409, the status write is
 * conditional on "Confirmed", and a claimed badge is released if the check-in then fails.
 */
export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ userId: string }> }) => {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  let releaseClaim: Release | null = null;
  try {
    const { userId } = await params;
    if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
      return sendErrorResponse("Invalid user id", null, 400);
    }

    const body: unknown = await req.json().catch(() => null);
    if (typeof body !== "object" || body === null) {
      return sendErrorResponse("Request body must be a JSON object", null, 400);
    }
    const { status, qrCodeNumber } = body as { status?: unknown; qrCodeNumber?: unknown };
    if (!status) {
      return sendErrorResponse("Status is required", null, 400);
    }
    if (qrCodeNumber !== undefined && !isBadgeNumber(qrCodeNumber)) {
      return sendErrorResponse("QR code number must be a positive integer", null, 400);
    }

    let config: EventConfig;
    try {
      config = getEventConfig();
    } catch (error) {
      console.error("Check-in refused, event settings are invalid:", describeError(error));
      return sendErrorResponse("Event settings are not configured", null, 500);
    }

    await connectMongoDB();

    const application = await Application.findById(userId);
    if (!application) {
      return sendErrorResponse("Application not found", null, 404);
    }
    if (isCheckedInStatus(application.status)) {
      return sendErrorResponse("User is already checked-in", null, 409);
    }
    if (application.status !== "Confirmed") {
      return sendErrorResponse("User is not confirmed", null, 409);
    }

    if (qrCodeNumber !== undefined) {
      const claim = await claimBadge(qrCodeNumber, userId, config.eventId, auth.admin.email);
      if (!claim.ok) {
        return sendErrorResponse(claim.message, null, 409);
      }
      releaseClaim = claim.release;
    }

    // Atomic: only a still-Confirmed applicant flips to Checked-in, so two check-ins of the same
    // person at the same moment can't both succeed. checkedInAt is written like event-checkin does.
    const updated = await Application.findOneAndUpdate(
      { _id: userId, status: "Confirmed" },
      { $set: { status: CHECKED_IN_STATUS, checkedInAt: new Date() } },
      { new: true },
    );
    if (!updated) {
      if (releaseClaim) await releaseBadge(releaseClaim);
      return sendErrorResponse("User is already checked-in or no longer confirmed", null, 409);
    }
    releaseClaim = null;

    await seedMeals(userId, application, config);

    return sendSuccessResponse("Attendance confirmed and meals record created", { status: CHECKED_IN_STATUS }, 200);
  } catch (error) {
    if (releaseClaim) await releaseBadge(releaseClaim);
    console.error("Error confirming attendance:", describeError(error));
    return sendErrorResponse("Something went wrong while confirming attendance", null, 500);
  }
};
