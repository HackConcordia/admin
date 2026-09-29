import { cookies } from "next/headers";

import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
import Admin from "@/repository/models/admin";
import Application from "@/repository/models/application";
import connectMongoDB from "@/repository/mongoose";
import { buildApplicationsQuery } from "@/lib/conuhacks/application-query";
import { formatSchool } from "@/lib/conuhacks/display";
import { fetchIsSuperAdmin } from "@/lib/require-admin";

import { ApplicationTable } from "./_components/application-table";
import { type ApplicationTableRow } from "./_components/columns";

function formatDateDDMMMYYYY(value: unknown): string | undefined {
  if (!value) return undefined;

  const d = new Date(value as any);
  if (Number.isNaN(d.getTime())) return undefined;

  const day = String(d.getDate()).padStart(2, "0");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
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
  travelReimbursement?: string;
  assignedStatus?: string;
  assignedTo?: string; // New param
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
    // The database decides, never the JWT claim (same rule as the API guards).
    isSuperAdmin: (await fetchIsSuperAdmin(String((payload as any).adminId))) === true,
  };
}

/**
 * Map raw Mongo docs to ApplicationTableRow[]
 */
function mapApplications(docs: any[], includeTravelDecision: boolean): ApplicationTableRow[] {
  return (docs ?? []).map((a) => ({
    _id: String(a._id),
    firstName: a.firstName,
    lastName: a.lastName,
    email: a.email,
    status: a.status,
    school: formatSchool(a.school, a.schoolOther),
    processedBy: a.processedBy,
    processedAt: a.processedAt ? formatDateDDMMMYYYY(a.processedAt) : undefined,
    // Only super admins decide travel (A2), so regular reviewers never receive the decision.
    ...(includeTravelDecision
      ? {
          travelReimbursementAmount: a.travelReimbursementAmount,
          travelReimbursementCurrency: a.travelReimbursementCurrency,
          isTravelReimbursementApproved: a.isTravelReimbursementApproved,
        }
      : {}),
    isStarred: a.isStarred || false,
    createdAt: a.createdAt ? formatDateDDMMMYYYY(a.createdAt) : undefined,
  }));
}

/**
 * Fetch paginated applications for super admins.
 */
async function getPaginatedApplications(
  search: string,
  status: string,
  travelReimbursement: string,
  assignedStatus: string,
  assignedTo: string,
  page: number,
  limit: number
): Promise<{
  applications: ApplicationTableRow[];
  pagination: PaginationInfo;
}> {
  const query = buildApplicationsQuery({ search, status, travelReimbursement, assignedStatus, assignedTo, isSuperAdmin: true });

  const total = await Application.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const apps = await Application.find(
    query,
    "email firstName lastName status school schoolOther processedBy processedAt travelReimbursementAmount travelReimbursementCurrency isTravelReimbursementApproved isStarred createdAt"
  )
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();

  return {
    applications: mapApplications(apps, true),
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
  travelReimbursement: string,
  assignedStatus: string,
  page: number,
  limit: number
): Promise<{
  applications: ApplicationTableRow[];
  pagination: PaginationInfo;
}> {
  if (!adminId) {
    return {
      applications: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  const admin = await Admin.findById(adminId)
    .select("assignedApplications")
    .lean()
    .exec();
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

  const query = buildApplicationsQuery({ search, status, travelReimbursement, assignedStatus, assignedIds, isSuperAdmin: false });

  const total = await Application.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const apps = await Application.find(
    query,
    "email firstName lastName status school schoolOther processedBy processedAt travelReimbursementAmount travelReimbursementCurrency isTravelReimbursementApproved isStarred createdAt"
  )
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();

  return {
    applications: mapApplications(apps, false),
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
  travelReimbursement: string;
  assignedStatus: string;
  assignedTo: string; // New param
  reviewers?: {
    email: string;
    firstName: string;
    lastName: string;
    _id: string;
  }[]; // New field
}> {
  const page = parseInt(searchParams.page || "1", 10);
  const limit = parseInt(searchParams.limit || "10", 10);
  const search = searchParams.search || "";
  const status = searchParams.status || "";
  const travelReimbursement = searchParams.travelReimbursement || "";
  const assignedStatus = searchParams.assignedStatus || "";
  const assignedTo = searchParams.assignedTo || ""; // New param

  try {
    const auth = await getAuthFromCookies();
    if (!auth) {
      return {
        applications: [],
        isSuperAdmin: false,
        pagination: { page, limit, total: 0, totalPages: 0 },
        search,
        status,
        travelReimbursement,
        assignedStatus,
        assignedTo: "",
      };
    }

    await connectMongoDB();

    if (auth.isSuperAdmin) {
      const result = await getPaginatedApplications(
        search,
        status,
        travelReimbursement,
        assignedStatus,
        assignedTo,
        page,
        limit
      );

      // Fetch all admins for the filter list
      const reviewers = await Admin.find({ isSuperAdmin: false })
        .select("firstName lastName email")
        .lean()
        .exec();

      return {
        applications: result.applications,
        isSuperAdmin: true,
        pagination: result.pagination,
        search,
        status,
        travelReimbursement,
        assignedStatus,
        assignedTo,
        reviewers: reviewers.map((r: any) => ({
          _id: String(r._id),
          firstName: r.firstName,
          lastName: r.lastName,
          email: r.email,
        })),
      };
    }

    const result = await getPaginatedAssignedApplications(
      auth.adminId,
      search,
      status,
      travelReimbursement,
      assignedStatus,
      page,
      limit
    );
    return {
      applications: result.applications,
      isSuperAdmin: false,
      pagination: result.pagination,
      search,
      status,
      travelReimbursement,
      assignedStatus,
      assignedTo: "",
    };
  } catch (err) {
    console.error("[getApplicationsSSR] Failed:", err);
    return {
      applications: [],
      isSuperAdmin: false,
      pagination: { page, limit, total: 0, totalPages: 0 },
      search,
      status,
      travelReimbursement,
      assignedStatus,
      assignedTo: "",
    };
  }
}

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const {
    applications,
    isSuperAdmin,
    pagination,
    search,
    status,
    travelReimbursement,
    assignedStatus,
    assignedTo,
    reviewers,
  } = await getApplicationsSSR(params);

  return (
    <ApplicationTable
      initialData={applications}
      isSuperAdmin={isSuperAdmin}
      pagination={pagination}
      initialSearch={search}
      initialStatus={status}
      initialTravelReimbursement={travelReimbursement}
      initialAssignedStatus={assignedStatus}
      initialAssignedTo={assignedTo}
      reviewers={reviewers}
    />
  );
}
