import connectMongoDB from "@/repository/mongoose";
import Application from "@/repository/models/application";
import { notFound } from "next/navigation";
import ApplicationView, { type ApplicationDetails } from "./view";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { applicationId: string } }) {
  if (!params?.applicationId) return notFound();

  await connectMongoDB();
  const app = (await Application.findById(params.applicationId).lean()) as any;
  if (!app) return notFound();

  const application: ApplicationDetails = {
    _id: String(app._id),
    firstName: app.firstName,
    lastName: app.lastName,
    age: app.age,
    phoneNumber: app.phoneNumber,
    email: app.email,
    status: app.status,
    processedBy: app.processedBy,
    processedAt: app.processedAt?.toISOString?.() ?? undefined,
    isFromMontreal: app.isFromMontreal,
    country: app.country,
    city: app.city,
    school: app.school,
    discipline: app.discipline,
    shirtSize: app.shirtSize,
    dietaryRestrictions: Array.isArray(app.dietaryRestrictions) ? app.dietaryRestrictions : [],
    dietaryRestrictionsDescription: app.dietaryRestrictionsDescription,
    hackathons: app.hackathons,
    github: app.github,
    linkedin: app.linkedin,
    hasResume: Boolean(app?.resume?.id),
  };

  return <ApplicationView application={application} adminEmail={null} />;
}
