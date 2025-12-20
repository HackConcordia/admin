// Imports
import type { NextRequest } from "next/server";

import User from "@/repository/models/user";
import Team from "@/repository/models/team"; // Import the Team model
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";
import connectMongoDB from "@/repository/mongoose";
import Application from "@/repository/models/application";

// Handler function
export const DELETE = async (req: NextRequest, { params }: { params: Promise<{ userId: string }> }) => {
  const { userId } = await params;

  if (!userId) {
    return sendErrorResponse("User ID is required", {}, 400);
  }

  try {
    await connectMongoDB();

    // Connect to MongoDB if not connected
    const user = await Application.findById(userId);

    if (!user) {
      return sendErrorResponse("User not found", {}, 404);
    }

    // Find teams where the user is a member
    const teams = await Team.find({ "members.userId": userId });

    // Remove the user from each team where they are a member
    await Promise.all(
      teams.map(async (team) => {
        // Remove the user from the members array
        team.members = team.members.filter((member: { userId: string }) => member.userId !== userId);
        await team.save(); // Save the updated team
      }),
    );

    // Delete the user from the User collection
    const deletedUser = await User.deleteOne({ _id: userId });
    const deleteApplication = await Application.deleteOne({ _id: userId });

    if (!deletedUser) {
      return sendErrorResponse("Error deleting user", {}, 500);
    }

    if (!deleteApplication) {
      return sendErrorResponse("Error deleting application", {}, 500);
    }

    return sendSuccessResponse(
      "User deleted successfully and removed from all teams",
      { deletedUser, updatedTeams: teams, deleteApplication },
      200,
    );
  } catch (error) {
    return sendErrorResponse("Failed to delete user and update teams", error, 500);
  }
};
