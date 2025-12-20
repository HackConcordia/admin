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

type SearchParams = {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
};

type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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
 * Build MongoDB query based on filters
 */
function buildQuery(search: string, status: string, assignedIds?: string[]): Record<string, any> {
  const query: Record<string, any> = {};

  // Search by email, firstName, or lastName (case-insensitive)
  if (search) {
    query.$or = [
      { email: { $regex: search, $options: "i" } },
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
    ];
  }

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Filter by assigned applications (for non-super admins)
  if (assignedIds !== undefined) {
    query._id = { $in: assignedIds };
  }

  return query;
}

/**
 * Fetch paginated applications for super admins.
 */
async function getPaginatedApplications(
  search: string,
  status: string,
  page: number,
  limit: number
): Promise<{ applications: ApplicationTableRow[]; pagination: PaginationInfo }> {
  const query = buildQuery(search, status);

  const total = await Application.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const apps = await Application.find(query, "email firstName lastName status createdAt processedBy")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();

  return {
    applications: mapApplications(apps),
    pagination: { page, limit, total, totalPages },
  };
}

/**
 * Fetch paginated applications for a regular admin (assigned only).
 */
async function getPaginatedAssignedApplications(
  adminId: string | undefined,
  search: string,
  status: string,
  page: number,
  limit: number
): Promise<{ applications: ApplicationTableRow[]; pagination: PaginationInfo }> {
  if (!adminId) {
    return {
      applications: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  const admin = await Admin.findById(adminId).select("assignedApplications").lean().exec();
  if (!admin) {
    return {
      applications: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  const assignedIds: string[] = (admin as any).assignedApplications || [];
  if (assignedIds.length === 0) {
    return {
      applications: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  const query = buildQuery(search, status, assignedIds);

  const total = await Application.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const apps = await Application.find(query, "email firstName lastName status createdAt processedBy")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();

  return {
    applications: mapApplications(apps),
    pagination: { page, limit, total, totalPages },
  };
}

/**
 * Main SSR loader with pagination support.
 */
async function getApplicationsSSR(searchParams: SearchParams): Promise<{
  applications: ApplicationTableRow[];
  isSuperAdmin: boolean;
  pagination: PaginationInfo;
  search: string;
  status: string;
}> {
  const page = parseInt(searchParams.page || "1", 10);
  const limit = parseInt(searchParams.limit || "10", 10);
  const search = searchParams.search || "";
  const status = searchParams.status || "";

  try {
    const auth = await getAuthFromCookies();
    if (!auth) {
      return {
        applications: [],
        isSuperAdmin: false,
        pagination: { page, limit, total: 0, totalPages: 0 },
        search,
        status,
      };
    }

    await connectMongoDB();

    if (auth.isSuperAdmin) {
      const result = await getPaginatedApplications(search, status, page, limit);
      return {
        applications: result.applications,
        isSuperAdmin: true,
        pagination: result.pagination,
        search,
        status,
      };
    }

    const result = await getPaginatedAssignedApplications(auth.adminId, search, status, page, limit);
    return {
      applications: result.applications,
      isSuperAdmin: false,
      pagination: result.pagination,
      search,
      status,
    };
  } catch (err) {
    console.error("[getApplicationsSSR] Failed:", err);
    return {
      applications: [],
      isSuperAdmin: false,
      pagination: { page, limit, total: 0, totalPages: 0 },
      search,
      status,
    };
  }
}

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const { applications, isSuperAdmin, pagination, search, status } = await getApplicationsSSR(params);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ApplicationTable
        initialData={applications}
        isSuperAdmin={isSuperAdmin}
        pagination={pagination}
        initialSearch={search}
        initialStatus={status}
      />
    </div>
  );
}
