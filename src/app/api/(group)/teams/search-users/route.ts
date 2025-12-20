import type { NextRequest, NextResponse } from "next/server";

import Team from "@/repository/models/team";
import Application from "@/repository/models/application";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";

export const dynamic = "force-dynamic";

// Statuses that allow a user to join a team
const ALLOWED_STATUSES = ["Submitted", "Admitted", "Waitlisted", "Confirmed", "CheckedIn"];

interface UserResult {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  isInTeam: boolean;
  teamName?: string;
  isEligible: boolean;
}

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  try {
    await connectMongoDB();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const eligibleOnly = searchParams.get("eligibleOnly") === "true";

    if (!query || query.length < 2) {
      return sendSuccessResponse("Search query too short", [], 200);
    }

    // Build search query
    const searchQuery: any = {
      $or: [
        { email: { $regex: query, $options: "i" } },
        { firstName: { $regex: query, $options: "i" } },
        { lastName: { $regex: query, $options: "i" } },
      ],
    };

    // If eligibleOnly, only search for users with allowed statuses
    if (eligibleOnly) {
      searchQuery.status = { $in: ALLOWED_STATUSES };
    }

    // Search for users
    const users = await Application.find(searchQuery, "email firstName lastName status").limit(10).lean();

    // Get all team members to check who's already in a team
    const teams = await Team.find({}, "teamName members").lean();
    const memberTeamMap = new Map<string, string>();

    teams.forEach((team: any) => {
      team.members?.forEach((member: { userId: string }) => {
        memberTeamMap.set(member.userId, team.teamName);
      });
    });

    // Map users with their team status and eligibility
    const results: UserResult[] = users.map((user: any) => {
      const userId = String(user._id);
      const teamName = memberTeamMap.get(userId);
      const isEligible = ALLOWED_STATUSES.includes(user.status) && !teamName;

      return {
        _id: userId,
        email: user.email,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        status: user.status,
        isInTeam: !!teamName,
        teamName: teamName,
        isEligible,
      };
    });

    // Sort: eligible users first, then by name
    results.sort((a, b) => {
      if (a.isEligible !== b.isEligible) {
        return a.isEligible ? -1 : 1;
      }
      if (a.isInTeam !== b.isInTeam) {
        return a.isInTeam ? 1 : -1;
      }
      return 0;
    });

    return sendSuccessResponse("Users found", results, 200);
  } catch (error) {
    return sendErrorResponse("Failed to search users", error, 500);
  }
};
