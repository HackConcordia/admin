import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";

import { AccountForm } from "./_components/account-form";

export const dynamic = "force-dynamic";

interface AdminData {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  isSuperAdmin: boolean;
}

async function getAdminDataSSR(): Promise<AdminData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = await verifyAuthToken(token);
    if (!payload) return null;

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/get-adminInfo/${payload.adminId}`,
      {
        headers: {
          Cookie: `${COOKIE_NAME}=${token}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    if (result.status === "success" && result.data) {
      return result.data;
    }

    return null;
  } catch (error) {
    console.error("Error fetching admin data:", error);
    return null;
  }
}

export default async function AccountPage() {
  const adminData = await getAdminDataSSR();

  if (!adminData) {
    redirect("/auth/v1/login");
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Account Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account information and password
          </p>
        </div>
      </div>

      <AccountForm adminData={adminData} />
    </div>
  );
}

