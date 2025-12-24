
import { NextResponse } from "next/server";
import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
import { cookies } from "next/headers";
import connectMongoDB from "@/repository/mongoose";
import Application from "@/repository/models/application";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();

    const { isStarred } = await request.json();

    const application = await Application.findById(applicationId);
    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    if (application.teamId) {
      // Update all team members
      await Application.updateMany(
        { teamId: application.teamId },
        { isStarred }
      );
      // Fetch updated application to return
      const updatedApp = await Application.findById(applicationId);
      return NextResponse.json({ data: updatedApp }, { status: 200 });
    } else {
      // Update single application
      const updatedApp = await Application.findByIdAndUpdate(
        applicationId,
        { isStarred },
        { new: true }
      );
      return NextResponse.json({ data: updatedApp }, { status: 200 });
    }
  } catch (error: any) {
    console.error("Error updating star status:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
