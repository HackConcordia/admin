import type { NextRequest } from "next/server";

import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import Admin from "@/repository/models/admin";
import Application from "@/repository/models/application";
import { groupForAutoAssign, type UnassignedApplication } from "@/lib/auto-assign-groups";
import { requireAdmin } from "@/lib/require-admin";

/**
 * GET: Fetches statistics about unassigned applications and available reviewers
 * POST: Auto-assigns unassigned "Submitted" applications to reviewers (non-SuperAdmin admins)
 * while keeping team members together under one reviewer.
 *
 * Algorithm:
 * 1. Fetch all unassigned applications with status "Submitted" and processedBy "Not processed"
 * 2. Group applications by teamId (empty teamId = individual group), then hold back every group
 *    with a travel reimbursement request: those (and their teams) are assigned manually to a
 *    super admin
 * 3. Get all non-SuperAdmin reviewers
 * 4. Track current assignments per reviewer
 * 5. Sort groups by size (largest first) for better distribution
 * 6. Assign each group to the reviewer with fewest current assignments
 * 7. Persist all changes to database
 */

/**
 * GET handler: Returns statistics for auto-assign preview
 */
export const GET = async (req: NextRequest) => {
  try {
    const auth = await requireAdmin(req, { superAdmin: true });
    if (!auth.ok) return auth.response;

    await connectMongoDB();

    const unassignedApplications = await Application.find({
      status: "Submitted",
      processedBy: "Not processed",
    })
      .select("_id teamId travelReimbursement")
      .lean<UnassignedApplication[]>()
      .exec();
    const unassignedCount = unassignedApplications.length;
    const { heldApplications, heldGroups } = groupForAutoAssign(unassignedApplications);

    // Count available reviewers (non-SuperAdmin admins)
    const reviewerCount = await Admin.countDocuments({ isSuperAdmin: false });

    return sendSuccessResponse(
      "Auto-assign statistics retrieved",
      {
        unassignedCount,
        reviewerCount,
        heldForManualAssignment: heldApplications,
        heldGroups,
      },
      200
    );
  } catch (error) {
    console.error("Error fetching auto-assign statistics:", error);
    return sendErrorResponse(
      "Failed to fetch auto-assign statistics",
      error,
      500
    );
  }
};

/**
 * POST handler: Performs the auto-assignment
 */
export const POST = async (req: NextRequest) => {
  try {
    const auth = await requireAdmin(req, { superAdmin: true });
    if (!auth.ok) return auth.response;

    await connectMongoDB();

    // Step 1: Fetch unassigned applications with "Submitted" status
    const unassignedApplications = await Application.find({
      status: "Submitted",
      processedBy: "Not processed",
    })
      .select("_id teamId travelReimbursement")
      .lean<UnassignedApplication[]>()
      .exec();

    if (!unassignedApplications || unassignedApplications.length === 0) {
      return sendSuccessResponse(
        "No unassigned applications found",
        {
          totalAssigned: 0,
          reviewerStats: [],
          teamsAssigned: 0,
          heldForManualAssignment: 0,
          heldGroups: 0,
        },
        200
      );
    }

    console.log(
      `Found ${unassignedApplications.length} unassigned applications`
    );

    // Step 2: Group applications by teamId
    const {
      assignable: teamGroups,
      heldApplications: heldForManualAssignment,
      heldGroups,
    } = groupForAutoAssign(unassignedApplications);

    console.log(`Grouped into ${teamGroups.size} groups (teams + individuals), held ${heldGroups} for manual assignment`);

    const totalAssigned = unassignedApplications.length - heldForManualAssignment;

    // Step 3: Get all non-SuperAdmin reviewers
    const reviewers = await Admin.find({ isSuperAdmin: false })
      .select("email assignedApplications")
      .lean()
      .exec();

    if (!reviewers || reviewers.length === 0) {
      return sendErrorResponse(
        "No reviewers available. Cannot auto-assign applications.",
        null,
        400
      );
    }

    console.log(`Found ${reviewers.length} reviewers`);

    // Step 4: Track current assignments per reviewer
    const reviewerAssignments = new Map<
      string,
      {
        email: string;
        count: number;
        applications: string[];
      }
    >();

    for (const reviewer of reviewers) {
      const existingCount = reviewer.assignedApplications?.length || 0;
      reviewerAssignments.set(reviewer.email, {
        email: reviewer.email,
      // count: existingCount,
        count: 0,
        applications: [...(reviewer.assignedApplications || [])],
      });
    }

    // Step 5: Sort groups by size (largest first) for better distribution
    const sortedGroups = Array.from(teamGroups.entries()).sort(
      (a, b) => b[1].length - a[1].length
    );

    // Track statistics
    let teamsAssigned = 0;
    const assignmentsByReviewer = new Map<string, string[]>();

    // Step 6: Assign each group to the reviewer with fewest current assignments
    for (const [teamId, applicationIds] of sortedGroups) {
      // Find reviewer with minimum assignments
      let minReviewer: {
        email: string;
        count: number;
        applications: string[];
      } | null = null;
      let minCount = Infinity;

      for (const reviewer of reviewerAssignments.values()) {
        if (reviewer.count < minCount) {
          minCount = reviewer.count;
          minReviewer = reviewer;
        }
      }

      if (!minReviewer) {
        console.error("No reviewer found - this should not happen");
        continue;
      }

      // Assign this group to the selected reviewer
      minReviewer.applications.push(...applicationIds);
      minReviewer.count += applicationIds.length;

      // Track for response statistics
      if (!assignmentsByReviewer.has(minReviewer.email)) {
        assignmentsByReviewer.set(minReviewer.email, []);
      }
      assignmentsByReviewer.get(minReviewer.email)!.push(...applicationIds);

      // Count teams (not individuals)
      if (!teamId.startsWith("individual_")) {
        teamsAssigned++;
      }

      console.log(
        `Assigned ${applicationIds.length} applications (${teamId}) to ${minReviewer.email} (new total: ${minReviewer.count})`
      );
    }

    // Step 7: Persist all changes to database
    const now = new Date();
    const updatePromises: Promise<any>[] = [];

    // Update applications
    for (const [reviewerEmail, applicationIds] of assignmentsByReviewer) {
      const updatePromise = Application.updateMany(
        { _id: { $in: applicationIds } },
        {
          $set: {
            processedBy: reviewerEmail,
          },
        }
      );
      updatePromises.push(updatePromise);
    }

    // Update admins
    for (const reviewer of reviewerAssignments.values()) {
      const updatePromise = Admin.updateOne(
        { email: reviewer.email },
        {
          $set: {
            assignedApplications: reviewer.applications,
          },
        }
      );
      updatePromises.push(updatePromise);
    }

    // Execute all updates
    await Promise.all(updatePromises);

    console.log(
      `Successfully assigned ${totalAssigned} applications`
    );

    // Prepare response statistics
    const reviewerStats = Array.from(assignmentsByReviewer.entries()).map(
      ([email, apps]) => ({
        reviewer: email,
        newAssignments: apps.length,
        totalAssignments: reviewerAssignments.get(email)!.count,
      })
    );

    const heldNote =
      heldForManualAssignment > 0
        ? ` ${heldForManualAssignment} application${heldForManualAssignment === 1 ? "" : "s"} (travel reimbursement requests and their teammates) left for manual assignment to a super admin.`
        : "";

    return sendSuccessResponse(
      `Applications successfully auto-assigned.${heldNote}`,
      {
        totalAssigned,
        reviewerStats,
        teamsAssigned,
        heldForManualAssignment,
        heldGroups,
      },
      200
    );
  } catch (error) {
    console.error("Error in auto-assign:", error);
    return sendErrorResponse("Failed to auto-assign applications", error, 500);
  }
};
