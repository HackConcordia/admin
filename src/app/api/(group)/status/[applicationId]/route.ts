import type { NextRequest } from "next/server";

import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse, sendSuccessResponse } from "@/repository/response";

import {
  sendAdmittedEmail,
  sendWaitlistedEmail,
  sendRefusedEmail,
} from "@/utils/admissionEmailConfig";
import Application from "@/repository/models/application";
import { requireAdmin } from "@/lib/require-admin";

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) => {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { applicationId } = await params;
    const { action, travelReimbursement } = await req.json();

    await connectMongoDB();

    const application = await Application.findById(applicationId);

    if (!application) {
      return sendErrorResponse("User not found", null, 404);
    }

    let emailToSend: (() => Promise<boolean>) | null = null;
    let newStatus = "";
    const updateFields: Record<string, any> = {
      processedBy: auth.admin.email,
      processedAt: new Date(),
    };

    if (action === "admit") {
      console.log(
        "Application Info",
        application.email,
        application.firstName,
        application.lastName
      );

      if (travelReimbursement) {
        updateFields.isTravelReimbursementApproved =
          travelReimbursement.approved;
        if (
          travelReimbursement.approved &&
          travelReimbursement.amount &&
          travelReimbursement.currency
        ) {
          updateFields.travelReimbursementAmount = travelReimbursement.amount;
          updateFields.travelReimbursementCurrency =
            travelReimbursement.currency;
        }
      }

      newStatus = "Admitted";
      updateFields.status = newStatus;

      emailToSend = () =>
        sendAdmittedEmail(
          application.email as string,
          application.firstName as string,
          application.lastName as string,
          travelReimbursement
        );
    } else if (action === "waitlist") {
      newStatus = "Waitlisted";
      updateFields.status = newStatus;

      emailToSend = () =>
        sendWaitlistedEmail(
          application.email as string,
          application.firstName as string,
          application.lastName as string
        );
    } else if (action === "reject") {
      newStatus = "Refused";
      updateFields.status = newStatus;

      emailToSend = () =>
        sendRefusedEmail(
          application.email as string,
          application.firstName as string,
          application.lastName as string
        );
    } else {
      return sendErrorResponse("Invalid action", null, 400);
    }

    await Application.findByIdAndUpdate(applicationId, updateFields, {
      new: true,
    });

    if (emailToSend) {
      try {
        const sendEmail = await emailToSend();
        if (!sendEmail) {
          console.log(
            "Failed to send email, but status was updated successfully"
          );
        } else {
          console.log("Email sent successfully");
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    }

    return sendSuccessResponse("Attendance confirmed", newStatus, 200);
  } catch (error) {
    console.error("Error in PATCH /api/status/[applicationId]:", error);
    return sendErrorResponse(
      "Something went wrong while confirming attendance",
      null,
      500
    );
  }
};
