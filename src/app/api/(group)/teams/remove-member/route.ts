import type { NextRequest } from "next/server";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
import connectMongoDB from "@/repository/mongoose";
import Team from "@/repository/models/team";
import Application from "@/repository/models/application";

export const dynamic = "force-dynamic";

interface Member {
  userId: string;
  isAdmitted: boolean;
}

// POST to remove a member from a team - only super admins can perform this action
export const POST = async (req: NextRequest) => {
  try {
    // Verify authentication and super admin status
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return sendErrorResponse("Unauthorized", null, 401);
    }

    const payload = await verifyAuthToken(token);
    if (!payload) {
      return sendErrorResponse("Unauthorized", null, 401);
    }

    // Check if user is super admin
    if (!payload.isSuperAdmin) {
      return sendErrorResponse(
        "Forbidden: Only super admins can remove team members",
        null,
        403
      );
    }

    const body = await req.json();
    const { teamId, userId } = body;

    if (!teamId) {
      return sendErrorResponse("Team ID is required", null, 400);
    }

    if (!userId) {
      return sendErrorResponse("User ID is required", null, 400);
    }

    await connectMongoDB();

    // Find the team
    const team = await Team.findById(teamId);
    if (!team) {
      return sendErrorResponse("Team not found", null, 404);
    }

    // Check if the user is in the team
    const memberIndex = team.members.findIndex(
      (member: Member) => member.userId === userId
    );
    if (memberIndex === -1) {
      return sendErrorResponse("User is not a member of this team", null, 400);
    }

    const isTeamOwner = team.teamOwner === userId;
    const memberCount = team.members.length;

    // Case 1: Only one member (the owner) - delete the entire team
    if (memberCount === 1) {
      // Update the application to remove teamId
      await Application.findByIdAndUpdate(userId, { $set: { teamId: "" } });

      // Delete the team
      await Team.findByIdAndDelete(teamId);

      return sendSuccessResponse(
        "Team deleted as the last member was removed",
        {
          action: "team_deleted",
          deletedTeamId: teamId,
          removedUserId: userId,
        },
        200
      );
    }

    // Case 2: Multiple members - remove the member
    // Remove the member from the array
    team.members.splice(memberIndex, 1);

    // If the removed member was the team owner, we need to:
    // 1. Select a new owner
    // 2. Delete the old team first (to avoid unique constraint errors)
    // 3. Create a new team with the new owner's ID as the _id
    // 4. Update all remaining members' applications with new teamId
    if (isTeamOwner && team.members.length > 0) {
      // Select a random member to be the new owner
      const randomIndex = Math.floor(Math.random() * team.members.length);
      const newOwner = team.members[randomIndex];
      const newOwnerId = newOwner.userId;

      // Store team data before deletion
      const teamData = {
        teamName: team.teamName,
        teamCode: team.teamCode,
        members: team.members,
      };

      // Delete the old team first (to avoid duplicate key errors on unique fields)
      await Team.findByIdAndDelete(teamId);

      // Create a new team document with the new owner's ID as _id
      const newTeam = new Team({
        _id: newOwnerId,
        teamName: teamData.teamName,
        teamCode: teamData.teamCode,
        members: teamData.members,
        teamOwner: newOwnerId,
      });

      // Save the new team
      await newTeam.save();

      // Update all remaining members' applications with the new teamId
      const remainingMemberIds = teamData.members.map((m: Member) => m.userId);
      await Application.updateMany(
        { _id: { $in: remainingMemberIds } },
        { $set: { teamId: newOwnerId } }
      );

      // Update the removed user's application to clear teamId
      await Application.findByIdAndUpdate(userId, { $set: { teamId: "" } });

      return sendSuccessResponse(
        "Member removed and new team owner assigned",
        {
          action: "owner_changed",
          oldTeamId: teamId,
          newTeamId: newOwnerId,
          removedUserId: userId,
          newOwner: newOwnerId,
        },
        200
      );
    }

    // Case 3: Removing a non-owner member - just update the existing team
    await team.save();

    // Update the removed user's application to clear teamId
    await Application.findByIdAndUpdate(userId, { $set: { teamId: "" } });

    return sendSuccessResponse(
      "Member removed successfully",
      {
        action: "member_removed",
        teamId,
        removedUserId: userId,
        newOwner: null,
      },
      200
    );
  } catch (error) {
    console.error("Error removing team member:", error);
    return sendErrorResponse("Failed to remove team member", error, 500);
  }
};

