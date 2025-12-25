import type { NextRequest, NextResponse } from "next/server";

import Team from "@/repository/models/team";
import Application from "@/repository/models/application";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";

export const dynamic = "force-dynamic";

interface AddMemberRequest {
  teamId: string;
  userEmail: string;
}

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  try {
    await connectMongoDB();

    const body: AddMemberRequest = await req.json();
    const { teamId, userEmail } = body;

    if (!teamId || !userEmail) {
      return sendErrorResponse("Team ID and user email are required", {}, 400);
    }

    // Find the team
    const team = await Team.findById(teamId);
    if (!team) {
      return sendErrorResponse("Team not found", {}, 404);
    }

    // Check if team already has 4 members
    if (team.members.length >= 4) {
      return sendErrorResponse("Team already has maximum members (4)", {}, 400);
    }

    // Find the user by email
    const user = await Application.findOne({ email: userEmail.toLowerCase() });
    if (!user) {
      return sendErrorResponse("User not found with this email", {}, 404);
    }

    const userId = String(user._id);

    // Check if user is already in this team
    const isAlreadyMember = team.members.some((member: { userId: string }) => member.userId === userId);
    if (isAlreadyMember) {
      return sendErrorResponse("User is already a member of this team", {}, 400);
    }

    // Check if user is already in another team
    const existingTeam = await Team.findOne({ "members.userId": userId });
    if (existingTeam) {
      return sendErrorResponse(`User is already a member of team "${existingTeam.teamName}"`, {}, 400);
    }

    // Add user to team
    team.members.push({
      userId: userId,
      isAdmitted: true,
    });

    await team.save();

    // Update the user's application with the team ID
    await Application.findByIdAndUpdate(userId, { teamId: teamId });

    return sendSuccessResponse(
      "Member added successfully",
      {
        teamId: team._id,
        newMember: {
          userId: userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      },
      200,
    );
  } catch (error) {
    return sendErrorResponse("Failed to add member to team", error, 500);
  }
};
