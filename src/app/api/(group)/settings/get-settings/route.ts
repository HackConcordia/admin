import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { toSettingsView } from "@/lib/settings/settings-view";
import Settings from "@/repository/models/settings";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";

/** Read-only. Returns the known fields only (dates as stored plus Montreal display text), not the raw document. */
export const GET = async (req: NextRequest) => {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    await connectMongoDB();
    const settings = await Settings.findOne().lean<Record<string, unknown>>();

    if (!settings) {
      return sendErrorResponse("Failed to retrieve settings.", null, 500);
    }

    return sendSuccessResponse("Successfully retrieved settings document", toSettingsView(settings), 200);
  } catch (error) {
    console.error("Error in GET /api/settings/get-settings:", error instanceof Error ? error.name : "unknown error");
    return sendErrorResponse("Failed to retrieve settings.", null, 500);
  }
};
