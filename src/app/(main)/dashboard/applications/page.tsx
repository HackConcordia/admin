import { cookies } from "next/headers";

import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
import Admin from "@/repository/models/admin";
import Application from "@/repository/models/application";
import connectMongoDB from "@/repository/mongoose";

import { ApplicationTable } from "./_components/application-table";
import { type ApplicationTableRow } from "./_components/columns";

function formatDateDDMMMYYYY(value: unknown): string | undefined {
  if (!value) return undefined;

  const d = new Date(value as any);
  if (Number.isNaN(d.getTime())) return undefined;

  const day = String(d.getDate()).padStart(2, "0");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
}

export const dynamic = "force-dynamic";

type AuthPayload = {
  adminId?: string;
  isSuperAdmin?: boolean;
};

/**
 * Read and verify the auth token from cookies.
 */
async function getAuthFromCookies(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyAuthToken(token);
  if (!payload) return null;

  return {
    adminId: (payload as any).adminId,
    isSuperAdmin: !!(payload as any).isSuperAdmin,
  };
}

/**
 * Map raw Mongo docs to ApplicationTableRow[]
 */
function mapApplications(docs: any[]): ApplicationTableRow[] {
  return (docs ?? []).map((a) => ({
    _id: String(a._id),
    firstName: a.firstName,
    lastName: a.lastName,
    email: a.email,
    status: a.status,
    createdAt: formatDateDDMMMYYYY(a.createdAt),
    processedBy: a.processedBy,
  }));
}

/**
 * Fetch all applications for super admins.
 */
async function getAllApplications(): Promise<ApplicationTableRow[]> {
  const apps = await Application.find({}, "email firstName lastName status createdAt processedBy").lean().exec();
  console.log("Fetched applications:", apps);

  return mapApplications(apps);
}

/**
 * Fetch only assigned applications for a regular admin.
 */
async function getAssignedApplications(adminId?: string): Promise<ApplicationTableRow[]> {
  if (!adminId) return [];

  const admin = await Admin.findById(adminId).select("assignedApplications").lean().exec();

  if (!admin) return [];

  const assignedApplications: string[] = (admin as any).assignedApplications && [];
  if (!assignedApplications.length) return [];

  const apps = await Application.find(
    { _id: { $in: assignedApplications } },
    "email firstName lastName status createddAt processedBy",
  )
    .lean()
    .exec();

  return mapApplications(apps);
}

/**
 * Main SSR loader – now low complexity.
 */
async function getApplicationsAndRoleSSR(): Promise<{
  applications: ApplicationTableRow[];
  isSuperAdmin: boolean;
}> {
  try {
    const auth = await getAuthFromCookies();
    if (!auth) {
      return { applications: [], isSuperAdmin: false };
    }

    await connectMongoDB();

    if (auth.isSuperAdmin) {
      const applications = await getAllApplications();
      return { applications, isSuperAdmin: true };
    }

    const applications = await getAssignedApplications(auth.adminId);
    return { applications, isSuperAdmin: false };
  } catch (err) {
    console.error("[getApplicationsAndRoleSSR] Failed:", err);
    return { applications: [], isSuperAdmin: false };
  }
}

export default async function Page() {
  const { applications: initialData, isSuperAdmin } = await getApplicationsAndRoleSSR();

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ApplicationTable initialData={initialData} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
