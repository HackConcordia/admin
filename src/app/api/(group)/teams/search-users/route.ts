import type { NextRequest, NextResponse } from "next/server";

import Team from "@/repository/models/team";
import Application from "@/repository/models/application";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";

export const dynamic = "force-dynamic";

interface UserResult {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  isInTeam: boolean;
  teamName?: string;
}

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  try {
    await connectMongoDB();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return sendSuccessResponse("Search query too short", [], 200);
    }

    // Search for users by email, firstName, or lastName
    const users = await Application.find(
      {
        $or: [
          { email: { $regex: query, $options: "i" } },
          { firstName: { $regex: query, $options: "i" } },
          { lastName: { $regex: query, $options: "i" } },
        ],
      },
      "email firstName lastName"
    )
      .limit(10)
      .lean();

    // Get all team members to check who's already in a team
    const teams = await Team.find({}, "teamName members").lean();
    const memberTeamMap = new Map<string, string>();

    teams.forEach((team: any) => {
      team.members?.forEach((member: { userId: string }) => {
        memberTeamMap.set(member.userId, team.teamName);
      });
    });

    // Map users with their team status
    const results: UserResult[] = users.map((user: any) => {
      const userId = String(user._id);
      const teamName = memberTeamMap.get(userId);
      return {
        _id: userId,
        email: user.email,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        isInTeam: !!teamName,
        teamName: teamName,
      };
    });

    // Sort: users not in a team first
    results.sort((a, b) => {
      if (a.isInTeam === b.isInTeam) return 0;
      return a.isInTeam ? 1 : -1;
    });

    return sendSuccessResponse("Users found", results, 200);
  } catch (error) {
    return sendErrorResponse("Failed to search users", error, 500);
  }
};

