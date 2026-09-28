import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { IVolunteer } from "@/interfaces/IVolunteer";
import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
import { fetchIsSuperAdmin } from "@/lib/require-admin";

import { CreateVolunteerDialog } from "./_components/create-volunteer-dialog";
import { VolunteerTable } from "./_components/volunteer-table";

export const dynamic = "force-dynamic";

async function getIsSuperAdminSSR(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;

    const payload = await verifyAuthToken(token);
    if (!payload) return false;

    // Same rule as requireAdmin: super-admin status comes from the database, not the JWT claim.
    return (await fetchIsSuperAdmin(payload.adminId)) === true;
  } catch {
    return false;
  }
}

async function getVolunteersSSR(): Promise<IVolunteer[]> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/volunteers`, {
      headers: token
        ? {
            Cookie: `${COOKIE_NAME}=${token}`,
          }
        : {},
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const result = await response.json();

    if (result.status === "success") {
      return (result.data as IVolunteer[]) || [];
    }

    return [];
  } catch (error) {
    console.error("Error fetching volunteers:", error);
    return [];
  }
}

export default async function VolunteersPage() {
  const isSuperAdmin = await getIsSuperAdminSSR();

  if (!isSuperAdmin) {
    redirect("/unauthorized");
  }

  const volunteers = await getVolunteersSSR();

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2>Volunteer Management</h2>
          <p className="text-xs text-muted-foreground">
            Manage the accounts volunteers use to sign in to the event check-in app
          </p>
        </div>

        {/* Create button that opens the modal */}
        <CreateVolunteerDialog />
      </div>

      <VolunteerTable initialData={volunteers} />
    </div>
  );
}
