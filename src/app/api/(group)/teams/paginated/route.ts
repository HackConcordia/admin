// Paginated teams API endpoint with filtering and sorting
import type { NextRequest, NextResponse } from "next/server";

import Team from "@/repository/models/team";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import Application from "@/repository/models/application";

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
  profileImgUrl: string;
}

interface TeamInfo {
  _id: string;
  teamName: string;
  teamCode: string;
  members: TeamMemberInfo[];
  teamOwner: string;
  memberCount: number;
}

interface PaginatedResponse {
  teams: TeamInfo[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalTeams: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Valid sort fields and orders
const VALID_SORT_FIELDS = ["teamName", "teamCode", "memberCount", "createdAt"] as const;
const VALID_SORT_ORDERS = ["asc", "desc"] as const;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  try {
    await connectMongoDB();

    // Parse pagination parameters from URL
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
    const search = searchParams.get("search") || "";

    // Parse sorting parameters
    const sortField = searchParams.get("sortField") || "teamName";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    // Parse filtering parameters
    const memberCountFilter = searchParams.get("memberCount"); // e.g., "1", "2", "3", "4+"

    // Build search query
    const searchQuery: any = {};

    if (search) {
      // Find users matching the search term (by name or email)
      const matchingUsers = await Application.find(
        {
          $or: [
            { email: { $regex: search, $options: "i" } },
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
          ],
        },
        "_id"
      ).lean();

      const matchingUserIds = matchingUsers.map((u: any) => String(u._id));

      // Search by team name, team code, OR teams containing matching users
      searchQuery.$or = [
        { teamName: { $regex: search, $options: "i" } },
        { teamCode: { $regex: search, $options: "i" } },
      ];

      // Only add member search if there are matching users
      if (matchingUserIds.length > 0) {
        searchQuery.$or.push({ "members.userId": { $in: matchingUserIds } });
      }
    }

    // Build aggregation pipeline for filtering and sorting
    const pipeline: any[] = [];

    // Match stage for search
    if (Object.keys(searchQuery).length > 0) {
      pipeline.push({ $match: searchQuery });
    }

    // Add memberCount field
    pipeline.push({
      $addFields: {
        memberCount: { $size: { $ifNull: ["$members", []] } },
      },
    });

    // Filter by member count
    if (memberCountFilter) {
      const count = parseInt(memberCountFilter, 10);
      if (!isNaN(count) && count >= 0 && count <= 4) {
        pipeline.push({ $match: { memberCount: count } });
      }
    }

    // Count total after filters (before pagination)
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await Team.aggregate(countPipeline);
    const totalTeams = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalTeams / limit);
    const skip = (page - 1) * limit;

    // Sorting
    const validSortField = VALID_SORT_FIELDS.includes(sortField as any) ? sortField : "teamName";
    const validSortOrder = VALID_SORT_ORDERS.includes(sortOrder as any) ? sortOrder : "asc";
    const sortDirection = validSortOrder === "asc" ? 1 : -1;

    pipeline.push({ $sort: { [validSortField]: sortDirection } });

    // Pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Execute aggregation
    const teams = await Team.aggregate(pipeline);

    if (!teams.length && page === 1) {
      const emptyResponse: PaginatedResponse = {
        teams: [],
        pagination: {
          page,
          limit,
          totalPages: 0,
          totalTeams: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      return sendSuccessResponse("No teams found", emptyResponse, 200);
    }

    // Fetch member details for each team
    const teamsInfo: TeamInfo[] = await Promise.all(
      teams.map(async (team: any) => {
        const membersInfo = await Promise.all(
          (team.members || []).map(async (member: Member) => {
            const user = (await Application.findOne({ _id: member.userId }, "email firstName lastName").lean()) as {
              email?: string;
              firstName?: string;
              lastName?: string;
            } | null;

            return {
              userId: member.userId,
              isAdmitted: member.isAdmitted,
              email: user?.email,
              firstName: user?.firstName,
              lastName: user?.lastName,
              profileImgUrl: "/images/avatars/avatar.png",
            } as TeamMemberInfo;
          }),
        );

        // Sort members so team owner appears first
        const sortedMembers = membersInfo.sort((a, b) => {
          if (a.userId === team.teamOwner) return -1;
          if (b.userId === team.teamOwner) return 1;
          return 0;
        });

        return {
          _id: String(team._id),
          teamName: team.teamName,
          teamCode: team.teamCode,
          members: sortedMembers,
          teamOwner: team.teamOwner,
          memberCount: team.memberCount || sortedMembers.length,
        } as TeamInfo;
      }),
    );

    const response: PaginatedResponse = {
      teams: teamsInfo,
      pagination: {
        page,
        limit,
        totalPages,
        totalTeams,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    return sendSuccessResponse("Teams fetched successfully", response, 200);
  } catch (error) {
    return sendErrorResponse("Failed to fetch teams", error, 500);
  }
};
