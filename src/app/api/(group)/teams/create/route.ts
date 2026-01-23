import crypto from "crypto";
import type { NextRequest, NextResponse } from "next/server";

import Team from "@/repository/models/team";
import Application from "@/repository/models/application";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";

export const dynamic = "force-dynamic";

// Generate a 6-character hex team code
function generateTeamCode(): string {
  return crypto.randomBytes(3).toString("hex");
}

// Statuses that allow a user to join a team (Submitted and beyond, excluding declined/refused)
const ALLOWED_STATUSES = [
  "Submitted",
  "Admitted",
  "Waitlisted",
  "Confirmed",
  "Checked-in",
];

interface CreateTeamRequest {
  teamName: string;
  teamLeaderEmail: string;
  additionalMemberEmails?: string[];
}

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  try {
    await connectMongoDB();

    const body: CreateTeamRequest = await req.json();
    const { teamName, teamLeaderEmail, additionalMemberEmails = [] } = body;

    // Validate required fields
    if (!teamName?.trim()) {
      return sendErrorResponse("Team name is required", {}, 400);
    }

    if (!teamLeaderEmail?.trim()) {
      return sendErrorResponse("Team leader email is required", {}, 400);
    }

    // Validate max members (1 leader + 3 additional = 4 max)
    if (additionalMemberEmails.length > 3) {
      return sendErrorResponse(
        "A team can have a maximum of 4 members",
        {},
        400
      );
    }

    // Check if team name already exists
    const existingTeam = await Team.findOne({ teamName: teamName.trim() });
    if (existingTeam) {
      return sendErrorResponse("A team with this name already exists", {}, 400);
    }

    // Find the team leader
    const teamLeader = await Application.findOne({
      email: teamLeaderEmail.toLowerCase().trim(),
    });
    if (!teamLeader) {
      return sendErrorResponse(
        "Team leader not found with this email",
        {},
        404
      );
    }

    // Check leader's status
    if (!ALLOWED_STATUSES.includes(teamLeader.status)) {
      return sendErrorResponse(
        `Team leader's application status must be at least "Submitted". Current status: "${teamLeader.status}"`,
        {},
        400
      );
    }

    const teamLeaderId = String(teamLeader._id);

    // Check if leader is already in a team
    const leaderExistingTeam = await Team.findOne({
      "members.userId": teamLeaderId,
    });
    if (leaderExistingTeam) {
      return sendErrorResponse(
        `Team leader is already a member of team "${leaderExistingTeam.teamName}"`,
        {},
        400
      );
    }

    // Check if a team with leader's ID already exists (since team _id = owner's application _id)
    const teamWithSameId = await Team.findById(teamLeader._id);
    if (teamWithSameId) {
      return sendErrorResponse(
        `A team already exists with this leader's ID. Team: "${teamWithSameId.teamName}"`,
        {},
        400
      );
    }

    // Process additional members
    const additionalMembers: Array<{
      userId: string;
      isAdmitted: boolean;
      email: string;
    }> = [];
    const processedEmails = new Set<string>([
      teamLeaderEmail.toLowerCase().trim(),
    ]);

    for (const email of additionalMemberEmails) {
      const normalizedEmail = email.toLowerCase().trim();

      // Skip empty emails
      if (!normalizedEmail) continue;

      // Check for duplicate emails in the request
      if (processedEmails.has(normalizedEmail)) {
        return sendErrorResponse(
          `Duplicate email in request: ${email}`,
          {},
          400
        );
      }
      processedEmails.add(normalizedEmail);

      // Find the member
      const member = await Application.findOne({ email: normalizedEmail });
      if (!member) {
        return sendErrorResponse(
          `User not found with email: ${email}`,
          {},
          404
        );
      }

      // Check member's status
      if (!ALLOWED_STATUSES.includes(member.status)) {
        return sendErrorResponse(
          `User "${email}" cannot join a team. Application status must be at least "Submitted". Current status: "${member.status}"`,
          {},
          400
        );
      }

      const memberId = String(member._id);

      // Check if member is already in a team
      const memberExistingTeam = await Team.findOne({
        "members.userId": memberId,
      });
      if (memberExistingTeam) {
        return sendErrorResponse(
          `User "${email}" is already a member of team "${memberExistingTeam.teamName}"`,
          {},
          400
        );
      }

      additionalMembers.push({
        userId: memberId,
        isAdmitted: true,
        email: member.email,
      });
    }

    // Generate unique team code
    let teamCode = generateTeamCode();
    let codeAttempts = 0;
    while (await Team.findOne({ teamCode })) {
      teamCode = generateTeamCode();
      codeAttempts++;
      if (codeAttempts > 10) {
        return sendErrorResponse(
          "Failed to generate unique team code. Please try again.",
          {},
          500
        );
      }
    }

    // Create the team - when created manually, all members are marked as admitted
    const members = [
      {
        userId: teamLeaderId,
        isAdmitted: true,
      },
      ...additionalMembers.map((m) => ({
        userId: m.userId,
        isAdmitted: true,
      })),
    ];

    const newTeam = new Team({
      _id: teamLeader._id, // Set team _id to match team owner's application _id
      teamName: teamName.trim(),
      teamCode,
      members,
      teamOwner: teamLeaderId,
    });

    await newTeam.save();

    // Update teamId for all members' applications
    const allMemberIds = [
      teamLeaderId,
      ...additionalMembers.map((m) => m.userId),
    ];
    await Application.updateMany(
      { _id: { $in: allMemberIds } },
      { teamId: String(newTeam._id) }
    );

    return sendSuccessResponse(
      "Team created successfully",
      {
        _id: newTeam._id,
        teamName: newTeam.teamName,
        teamCode: newTeam.teamCode,
        teamOwner: teamLeaderId,
        memberCount: members.length,
      },
      201
    );
  } catch (error: any) {
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return sendErrorResponse(
        `A team with this ${field} already exists`,
        {},
        400
      );
    }
    return sendErrorResponse("Failed to create team", error, 500);
  }
};
