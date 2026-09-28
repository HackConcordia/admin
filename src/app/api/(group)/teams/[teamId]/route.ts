import type { NextRequest } from "next/server";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import { requireAdmin } from "@/lib/require-admin";
import connectMongoDB from "@/repository/mongoose";
import Team from "@/repository/models/team";
import Application from "@/repository/models/application";

export const dynamic = "force-dynamic";

// DELETE a team - only super admins can perform this action
export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) => {
  try {
    const auth = await requireAdmin(req, { superAdmin: true });
    if (!auth.ok) return auth.response;

    const { teamId } = await params;

    if (!teamId) {
      return sendErrorResponse("Team ID is required", null, 400);
    }

    await connectMongoDB();

    // Find the team first to get member IDs
    const team = await Team.findById(teamId);
    if (!team) {
      return sendErrorResponse("Team not found", null, 404);
    }

    // Get all member user IDs from the team
    const memberUserIds = team.members.map((member: { userId: string }) => member.userId);

    // Update all applications that belong to team members - set teamId to empty string
    if (memberUserIds.length > 0) {
      await Application.updateMany(
        { _id: { $in: memberUserIds } },
        { $set: { teamId: "" } }
      );
    }

    // Delete the team
    await Team.findByIdAndDelete(teamId);

    return sendSuccessResponse(
      "Team deleted successfully",
      {
        deletedTeamId: teamId,
        updatedApplications: memberUserIds.length
      },
      200
    );
  } catch (error) {
    console.error("Error deleting team:", error);
    return sendErrorResponse("Failed to delete team", error, 500);
  }
};

