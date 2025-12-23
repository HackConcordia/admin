import connectMongoDB from "@/repository/mongoose";
import Application from "@/repository/models/application";
import Team from "@/repository/models/team";
import { notFound } from "next/navigation";
import ApplicationView, {
  type ApplicationDetails,
  type TeamData,
} from "./view";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  if (!applicationId) return notFound();

  await connectMongoDB();
  const app = (await Application.findById(applicationId).lean()) as any;
  if (!app) return notFound();

  const application: ApplicationDetails = {
    _id: String(app._id),
    firstName: app.firstName,
    lastName: app.lastName,
    isEighteenOrAbove: app.isEighteenOrAbove,
    phoneNumber: app.phoneNumber,
    email: app.email,
    country: app.country,
    city: app.city,
    school: app.school,
    schoolOther: app.schoolOther,
    faculty: app.faculty,
    facultyOther: app.facultyOther,
    levelOfStudy: app.levelOfStudy,
    levelOfStudyOther: app.levelOfStudyOther,
    program: app.program,
    programOther: app.programOther,
    graduationSemester: app.graduationSemester,
    graduationYear: app.graduationYear,
    coolProject: app.coolProject,
    excitedAbout: app.excitedAbout,
    travelReimbursement: app.travelReimbursement,
    preferredLanguage: app.preferredLanguage,
    workingLanguages: app.workingLanguages,
    workingLanguagesOther: app.workingLanguagesOther,
    shirtSize: app.shirtSize,
    dietaryRestrictions: Array.isArray(app.dietaryRestrictions)
      ? app.dietaryRestrictions
      : [],
    dietaryRestrictionsDescription: app.dietaryRestrictionsDescription,
    github: app.github,
    linkedin: app.linkedin,
    gender: app.gender,
    pronouns: app.pronouns,
    underrepresented: app.underrepresented,
    jobRolesLookingFor: app.jobRolesLookingFor,
    workRegions: app.workRegions,
    workRegionsOther: app.workRegionsOther,
    jobTypesInterested: app.jobTypesInterested,
    jobTypesInterestedOther: app.jobTypesInterestedOther,
    isRegisteredForCoop: app.isRegisteredForCoop,
    nextCoopTerm: app.nextCoopTerm,
    nextCoopTermOther: app.nextCoopTermOther,
    status: app.status,
    teamId: app.teamId,
    processedBy: app.processedBy,
    processedAt: app.processedAt?.toISOString?.() ?? undefined,
    hasResume: Boolean(app?.resume?.id),
    isTravelReimbursementApproved: app.isTravelReimbursementApproved,
    travelReimbursementAmount: app.travelReimbursementAmount,
    travelReimbursementCurrency: app.travelReimbursementCurrency,
    comments: app.comments,
    skillTags: app.skillTags,
  };

  // Fetch team data if the applicant is in a team
  let teamData: TeamData = null;
  try {
    if (app.teamId) {
      const team = await Team.findById(app.teamId)
        .select("teamName members")
        .lean()
        .exec();

      if (team) {
        // Fetch member details
        const memberIds = (team as any).members.map((m: any) => m.userId);
        const members = await Application.find({ _id: { $in: memberIds } })
          .select("_id firstName lastName email")
          .lean()
          .exec();

        teamData = {
          teamId: String(app.teamId),
          teamName: (team as any).teamName,
          members: members.map((m: any) => ({
            userId: String(m._id),
            firstName: m.firstName,
            lastName: m.lastName,
            email: m.email,
          })),
        };
      }
    }
  } catch (error) {
    console.error("Failed to fetch team data:", error);
    // Continue without team data if fetch fails
  }

  return (
    <ApplicationView
      application={application}
      adminEmail={null}
      teamData={teamData}
    />
  );
}
