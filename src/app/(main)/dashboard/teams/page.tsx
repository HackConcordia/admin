import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import connectMongoDB from "@/repository/mongoose";
import Team from "@/repository/models/team";
import Application from "@/repository/models/application";

import { TeamsGrid } from "./_components/teams-grid";
import type { TeamCardProps } from "./_components/team-card";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    sortField?: string;
    sortOrder?: string;
    memberCount?: string;
  }>;
}

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

// Valid sort fields and orders
const VALID_SORT_FIELDS = ["teamName", "teamCode", "memberCount", "createdAt"];
const VALID_SORT_ORDERS = ["asc", "desc"];

async function getTeamsSSR(searchParams: {
  page?: string;
  limit?: string;
  search?: string;
  sortField?: string;
  sortOrder?: string;
  memberCount?: string;
}): Promise<{
  teams: TeamCardProps[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalTeams: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters: {
    search: string;
    memberCount: string;
    sortField: string;
    sortOrder: string;
  };
}> {
  try {
    await connectMongoDB();

    const page = Math.max(1, parseInt(searchParams.page || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.limit || "8", 10)));
    const search = searchParams.search || "";

    // Parse sorting parameters
    const sortField = VALID_SORT_FIELDS.includes(searchParams.sortField || "") ? searchParams.sortField! : "memberCount";
    const sortOrder = VALID_SORT_ORDERS.includes(searchParams.sortOrder || "") ? searchParams.sortOrder! : "asc";

    // Parse filtering parameters
    const memberCountFilter = searchParams.memberCount || "";

    // Build search query
    const searchQuery: any = {};

    if (search) {
      searchQuery.$or = [
        { teamName: { $regex: search, $options: "i" } },
        { teamCode: { $regex: search, $options: "i" } },
      ];
    }

    // Build aggregation pipeline
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

    // Count total after filters
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await Team.aggregate(countPipeline);
    const totalTeams = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalTeams / limit);
    const skip = (page - 1) * limit;

    // Sorting
    const sortDirection = sortOrder === "asc" ? 1 : -1;
    pipeline.push({ $sort: { [sortField]: sortDirection } });

    // Pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Execute aggregation
    const teams = await Team.aggregate(pipeline);

    // Fetch member details for each team
    const teamsInfo: TeamCardProps[] = await Promise.all(
      teams.map(async (team: any) => {
        const membersInfo = await Promise.all(
          (team.members || []).map(async (member: Member) => {
            const user = await Application.findOne({ _id: member.userId }, "email firstName lastName").lean();

            return {
              userId: member.userId,
              isAdmitted: member.isAdmitted,
              email: (user as any)?.email,
              firstName: (user as any)?.firstName,
              lastName: (user as any)?.lastName,
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
        };
      }),
    );

    return {
      teams: teamsInfo,
      pagination: {
        page,
        limit,
        totalPages,
        totalTeams,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: {
        search,
        memberCount: memberCountFilter,
        sortField,
        sortOrder,
      },
    };
  } catch (error) {
    console.error("Error fetching teams:", error);
    return {
      teams: [],
      pagination: {
        page: 1,
        limit: 12,
        totalPages: 0,
        totalTeams: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
      filters: {
        search: "",
        memberCount: "",
        sortField: "memberCount",
        sortOrder: "asc",
      },
    };
  }
}

function TeamsLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
    </div>
  );
}

export default async function TeamsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { teams, pagination, filters } = await getTeamsSSR(params);

  return (
    <Suspense fallback={<TeamsLoading />}>
      <TeamsGrid initialTeams={teams} initialPagination={pagination} initialFilters={filters} />
    </Suspense>
  );
}
