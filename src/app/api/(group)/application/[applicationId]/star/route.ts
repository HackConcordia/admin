import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
import { cookies } from "next/headers";
import connectMongoDB from "@/repository/mongoose";
import Application from "@/repository/models/application";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return sendErrorResponse("Unauthorized", null, 401);
    }

    const payload = await verifyAuthToken(token);
    if (!payload) {
      return sendErrorResponse("Unauthorized", null, 401);
    }

    await connectMongoDB();

    const { isStarred } = await request.json();

    const application = await Application.findById(applicationId);
    if (!application) {
      return sendErrorResponse("Application not found", null, 404);
    }

    // Update single application
    const updatedApp = await Application.findByIdAndUpdate(
      applicationId,
      { isStarred },
      { new: true }
    );
    return sendSuccessResponse("Application updated successfully", updatedApp, 200);
  } catch (error: any) {
    console.error("Error updating star status:", error);
    return sendErrorResponse(error.message || "Internal Server Error", null, 500);
  }
}
