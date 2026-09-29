import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import mongoose from "mongoose";

import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
import { toApplicationDetails, type TeamData } from "@/lib/conuhacks/application-details";
import { redactSensitiveApplicantFields } from "@/lib/conuhacks/redact-applicant-fields";
import { fetchIsSuperAdmin } from "@/lib/require-admin";
import Application from "@/repository/models/application";
import Team from "@/repository/models/team";
import connectMongoDB from "@/repository/mongoose";

import ApplicationView from "./view";

export const dynamic = "force-dynamic";

/** Same rule as the API (src/lib/require-admin.ts): super-admin status comes from the database, not the JWT claim. */
async function getIsSuperAdminSSR(): Promise<boolean> {
  try {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    if (!token) return false;
    const payload = await verifyAuthToken(token);
    if (!payload) return false;
    return (await fetchIsSuperAdmin(payload.adminId)) === true;
  } catch {
    return false;
  }
}

async function getTeamData(teamId: string): Promise<TeamData> {
  if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) return null;
  try {
    const team = await Team.findById(teamId).select("teamName members").lean<{ teamName?: string; members?: { userId: string }[] }>().exec();
    if (!team) return null;

    const memberIds = (team.members ?? []).map((member) => member.userId);
    const members = await Application.find({ _id: { $in: memberIds } }).select("_id firstName lastName email").lean().exec();

    return {
      teamId,
      teamName: team.teamName ?? "",
      members: (members as Record<string, unknown>[]).map((member) => ({
        userId: String(member._id),
        firstName: String(member.firstName ?? ""),
        lastName: String(member.lastName ?? ""),
        email: String(member.email ?? ""),
      })),
    };
  } catch (error) {
    console.error("Failed to fetch team data:", error instanceof Error ? error.message : "unknown error");
    return null;
  }
}

export default async function Page({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) return notFound();

  await connectMongoDB();
  const doc = await Application.findById(applicationId).lean<Record<string, unknown>>();
  if (!doc) return notFound();

  const rawDetails = toApplicationDetails(doc);
  const [teamData, isSuperAdmin] = await Promise.all([getTeamData(rawDetails.teamId ?? ""), getIsSuperAdminSSR()]);
  // Never send shirtSize/dietaryRestrictions/gender/pronouns etc. to a non-super admin's browser,
  // even though the view also hides them: server-side redaction is what actually keeps them out
  // of the page's initial HTML/RSC payload, not just out of the rendered UI.
  const application = redactSensitiveApplicantFields(rawDetails, isSuperAdmin);

  return <ApplicationView application={application} teamData={teamData} isSuperAdmin={isSuperAdmin} />;
}
