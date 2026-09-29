import type { NextRequest } from "next/server";

import {
  ADVANCED_STATS_FIELDS,
  computeAdvancedStats,
  redactSensitiveAdvancedStats,
  type AdvancedStatsAdmin,
} from "@/lib/conuhacks/advanced-stats";
import { fetchIsSuperAdmin, requireAdmin } from "@/lib/require-admin";
import Admin from "@/repository/models/admin";
import Application from "@/repository/models/application";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = async (req: NextRequest) => {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    await connectMongoDB();
    const applications = await Application.find({ status: { $nin: ["Unverified", "Incomplete"] } }, ADVANCED_STATS_FIELDS).lean<
      Record<string, unknown>[]
    >();
    const admins = await Admin.find({}, "firstName lastName email assignedApplications").lean<AdvancedStatsAdmin[]>();
    const isSuperAdmin = (await fetchIsSuperAdmin(auth.admin.adminId)) === true;

    return sendSuccessResponse(
      "Advanced statistics retrieved successfully",
      redactSensitiveAdvancedStats(computeAdvancedStats(applications, admins), isSuperAdmin),
    );
  } catch (error) {
    console.error("Failed to compute advanced statistics:", error instanceof Error ? error.name : "unknown error");
    return sendErrorResponse("Failed to retrieve advanced statistics", null, 500);
  }
};
