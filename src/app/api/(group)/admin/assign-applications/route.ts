import type { NextRequest } from "next/server";

import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import Admin from "@/repository/models/admin";
import Application from "@/repository/models/application";
import Team from "@/repository/models/team";
import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";

export const POST = async (req: NextRequest) => {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return sendErrorResponse("Unauthorized", null, 401);
    }

    const payload = await verifyAuthToken(token);
    if (!payload) {
      return sendErrorResponse("Unauthorized", null, 401);
    }

    if (!payload.isSuperAdmin) {
      return sendErrorResponse("Forbidden", null, 403);
    }

    const { selectedAdminEmail, selectedApplicants } = await req.json();

    console.log("Selected Admin Email", selectedAdminEmail);
    console.log("Selected Applicants", selectedApplicants);

    if (!(selectedAdminEmail && selectedApplicants)) {
      return sendErrorResponse(
        "Admin email or applicants list is not present in the body",
        null,
        400
      );
    }

    await connectMongoDB();

    const admin = await Admin.findOne({ email: selectedAdminEmail });

    if (!admin) {
      return sendErrorResponse("Admin not found", null, 404);
    }

    // Collect all application IDs including team members
    const allApplicationIds = new Set<string>(selectedApplicants);
    let teamMembersAdded = 0;

    // For each selected application, check if they're in a team and add all team members
    for (const applicationId of selectedApplicants) {
      try {
        const application = (await Application.findById(applicationId)
          .select("teamId")
          .lean()
          .exec()) as any;

        if (application && application.teamId) {
          // Fetch team members
          const team = (await Team.findById(application.teamId)
            .select("members")
            .lean()
            .exec()) as any;

          if (team && team.members) {
            const teamMembers = team.members as Array<{ userId: string }>;

            for (const member of teamMembers) {
              const memberAppId = member.userId;
              // If this team member wasn't already in the selected list, count it as added
              if (!allApplicationIds.has(memberAppId)) {
                allApplicationIds.add(memberAppId);
                teamMembersAdded++;
              }
            }
          }
        }
      } catch (error) {
        console.error(
          `Error fetching team for application ${applicationId}:`,
          error
        );
        // Continue with other applications even if one fails
      }
    }

    // Create a new array with unique values including team members
    const existingApplications = admin.assignedApplications || [];
    const uniqueApplications = Array.from(
      new Set([...existingApplications, ...Array.from(allApplicationIds)])
    );

    admin.assignedApplications = uniqueApplications;

    for (const applicationId of Array.from(allApplicationIds)) {
      const applicant = await Application.findById(applicationId);

      if (!applicant) {
        return sendErrorResponse("Applicant not found", null, 404);
      }

      if (
        applicant.processedBy !== selectedAdminEmail &&
        applicant.processedBy !== "Not processed"
      ) {
        // Find previous admin and remove the application from their assignedApplications
        const previousAdmin = await Admin.findOne({
          email: applicant.processedBy,
        });

        if (previousAdmin) {
          previousAdmin.assignedApplications =
            previousAdmin.assignedApplications.filter(
              (appId: string) => appId !== applicationId
            );

          await previousAdmin.save();
        }
      }

      // Update the application with the new admin
      const updateApplicant = await Application.findByIdAndUpdate(
        applicationId,
        {
          $set: { processedBy: selectedAdminEmail },
        },
        { new: true }
      );

      if (!updateApplicant) {
        return sendErrorResponse("Failed to update applicant", null, 500);
      }
    }

    await admin.save();

    return sendSuccessResponse(
      "Applications successfully assigned",
      {
        assignedApplications: admin.assignedApplications,
        totalAssigned: allApplicationIds.size,
        teamMembersAdded: teamMembersAdded,
      },
      200
    );
  } catch (error) {
    return sendErrorResponse("Failed to assign applications", error, 500);
  }
};
