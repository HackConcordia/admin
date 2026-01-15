// Import necessary modules and models
import type { NextRequest, NextResponse } from "next/server";

import Team from "@/repository/models/team";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import Application from "@/repository/models/application";

// TypeScript types for improved code safety and clarity
interface Member {
  userId: string;
  isAdmitted: boolean;
}

interface TeamMemberInfo {
  userId: string;
  isAdmitted: boolean;
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  profileImgUrl: string;
}

interface TeamInfo {
  _id: string;
  teamName: string;
  teamCode: string;
  members: TeamMemberInfo[];
  teamOwner: string;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Request handler function
export const GET = async (): Promise<NextResponse> => {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Fetch all teams from the Team collection
    const teams = await Team.find();

    // If no teams found, return an error response
    if (!teams.length) {
      return sendErrorResponse("No teams found", {}, 404);
    }

    // Iterate over each team and fetch user details for each member
    const teamsInfo: TeamInfo[] = await Promise.all(
      teams.map(async (team) => {
        // Fetch and enrich member details
        const membersInfo = await Promise.all(
          team.members.map(async (member: Member) => {
            const user = await Application.findOne({ _id: member.userId }, "email firstName lastName status");

            return {
              userId: member.userId,
              isAdmitted: member.isAdmitted,
              email: user?.email,
              firstName: user?.firstName,
              lastName: user?.lastName,
              status: user?.status,
              profileImgUrl: "/images/avatars/avatar.png",
            } as TeamMemberInfo;
          }),
        );

        // Sort members such that the team owner appears at the top
        const sortedMembers = membersInfo.sort((a, b) => {
          if (a.userId === team.teamOwner) return -1; // Team owner first
          if (b.userId === team.teamOwner) return 1;
          return 0; // Keep the rest of the order unchanged
        });

        // Construct the team object
        return {
          _id: team._id,
          teamName: team.teamName,
          teamCode: team.teamCode,
          members: sortedMembers,
          teamOwner: team.teamOwner,
        } as TeamInfo;
      }),
    );

    // Sort teams by the number of members in ascending order
    const sortedTeams = teamsInfo.sort((a, b) => a.members.length - b.members.length);

    // Return a successful response with the sorted team information
    return sendSuccessResponse("All Teams Info", sortedTeams, 200);
  } catch (error) {
    // Handle any errors that occur during the operation
    return sendErrorResponse("Failed to fetch teams", error, 500);
  }
};
