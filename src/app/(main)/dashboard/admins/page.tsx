import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";

import { AdminTable } from "./_components/admin-table";
import type { AdminTableRow } from "./_components/columns";
import { CreateAdminForm } from "./_components/create-admin-form";

export const dynamic = "force-dynamic";

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

async function getAdminsSSR(): Promise<{
  data: AdminTableRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
}> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/admin?page=1&pageSize=10`, {
      headers: {
        Cookie: `${COOKIE_NAME}=${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        data: [],
        pagination: { page: 1, pageSize: 10, totalRecords: 0, totalPages: 0 },
      };
    }

    const result = await response.json();
    if (result.status === "success") {
      return {
        data: result.data.data || [],
        pagination: result.data.pagination || { page: 1, pageSize: 10, totalRecords: 0, totalPages: 0 },
      };
    }

    return {
      data: [],
      pagination: { page: 1, pageSize: 10, totalRecords: 0, totalPages: 0 },
    };
  } catch (error) {
    console.error("Error fetching admins:", error);
    return {
      data: [],
      pagination: { page: 1, pageSize: 10, totalRecords: 0, totalPages: 0 },
    };
  }
}

export default async function AdminsPage() {
  const isSuperAdmin = await getIsSuperAdminSSR();

  if (!isSuperAdmin) {
    redirect("/dashboard/unauthorized");
  }

  const { data, pagination } = await getAdminsSSR();

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Management</h1>
          <p className="text-muted-foreground">Manage admin accounts and permissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminTable initialData={data} initialPagination={pagination} />
        </div>
        <div className="lg:col-span-1">
          <CreateAdminForm />
        </div>
      </div>
    </div>
  );
}

