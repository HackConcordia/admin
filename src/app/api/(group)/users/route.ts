import type { NextRequest } from "next/server";

import connectMongoDB from "@/repository/mongoose";
import { sendSuccessResponse, sendErrorResponse } from "@/repository/response";
import Application from "@/repository/models/application";
import type { IApplication } from "@/interfaces/IApplication";
import Admin from "@/repository/models/admin";
import { requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = async (req: NextRequest) => {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    await connectMongoDB();

    const admin = await Admin.findById(auth.admin.adminId);

    if (!admin) {
      return sendErrorResponse("Admin not found", {}, 404);
    }

    if (admin.isSuperAdmin) {
      const applications: IApplication[] | null = await Application.find(
        {},
        "email firstName lastName status processedBy",
      );

      if (!applications) {
        return sendErrorResponse("No applications found", {}, 404);
      }

      const response = sendSuccessResponse("applications information retrieved successfully", applications, 200);
      response.headers.set("Cache-Control", "no-store");
      return response;
    } else {
      const assignedApplications: string[] = admin.assignedApplications || [];
      const applicantsForAdmin: IApplication[] = [];

      for (const applicationId of assignedApplications) {
        const application: IApplication | null = await Application.findById(
          applicationId,
          "email firstName lastName status processedBy",
        );

        if (application) {
          applicantsForAdmin.push(application);
        }
      }

      const response = sendSuccessResponse("applications information retrieved successfully", applicantsForAdmin, 200);
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
  } catch (error) {
    return sendErrorResponse("Failed to retrieve applications information", error, 500);
  }
};
