import { cookies } from "next/headers";

import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
import Admin from "@/repository/models/admin";
import Application from "@/repository/models/application";
import connectMongoDB from "@/repository/mongoose";

import { ApplicationTable } from "./_components/application-table";
import { type ApplicationTableRow } from "./_components/columns";

export const dynamic = "force-dynamic";

async function getApplicationsSSR(): Promise<ApplicationTableRow[]> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) {
      return [];
    }

    const payload = await verifyAuthToken(token);
    if (!payload) {
      return [];
    }

    await connectMongoDB();

    // Super admin can see all applications
    if (payload.isSuperAdmin) {
      const apps = await Application.find({}, "email firstName lastName status processedBy").lean();
      return (apps ?? []).map((a: any) => ({
        _id: String(a._id),
        firstName: a.firstName,
        lastName: a.lastName,
        email: a.email,
        status: a.status,
        processedBy: a.processedBy,
      }));
    }

    // Non-super admins: only see assigned applications
    const admin = await Admin.findById(payload.adminId).select("assignedApplications").lean();
    if (!admin) {
      return [];
    }

    const assignedApplications: string[] = (admin as any).assignedApplications || [];
    if (!assignedApplications.length) {
      return [];
    }

    const apps = await Application.find(
      { _id: { $in: assignedApplications } },
      "email firstName lastName status processedBy",
    ).lean();

    return (apps ?? []).map((a: any) => ({
      _id: String(a._id),
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email,
      status: a.status,
      processedBy: a.processedBy,
    }));
  } catch {
    return [];
  }
}

async function getIsSuperAdminSSR(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;
    const payload = await verifyAuthToken(token);
    return !!payload?.isSuperAdmin;
  } catch {
    return false;
  }
}

export default async function Page() {
  const initialData = await getApplicationsSSR();
  const isSuperAdmin = await getIsSuperAdminSSR();

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ApplicationTable initialData={initialData} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
