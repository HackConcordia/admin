import { cookies } from "next/headers";

import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
import Admin from "@/repository/models/admin";
import Application from "@/repository/models/application";
import connectMongoDB from "@/repository/mongoose";
import { getQuebecCities } from "@/constants/Cities";

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
    school: a.school,
    processedBy: a.processedBy,
    processedAt: a.processedAt ? formatDateDDMMMYYYY(a.processedAt) : undefined,
    travelReimbursementAmount: a.travelReimbursementAmount,
    travelReimbursementCurrency: a.travelReimbursementCurrency,
    isTravelReimbursementApproved: a.isTravelReimbursementApproved,
    isStarred: a.isStarred || false,
    createdAt: a.createdAt ? formatDateDDMMMYYYY(a.createdAt) : undefined,
  }));
}

/**
 * Build MongoDB query based on filters
 */
function buildQuery(
  search: string,
  status: string,
  travelReimbursement: string,
  assignedStatus?: string,
  assignedIds?: string[],
  assignedTo?: string // New param
): Record<string, any> {
  const query: Record<string, any> = {};

  // Search by email or full name (firstName + lastName concatenated)
  if (search) {
    query.$or = [
      { email: { $regex: search, $options: "i" } },
      {
        $expr: {
          $regexMatch: {
            input: { $concat: ["$firstName", " ", "$lastName"] },
            regex: search,
            options: "i",
          },
        },
      },
    ];
  }

  // Filter by status (can be comma-separated for multiple statuses)
  if (status) {
    const statuses = status.split(",").filter(Boolean);
    if (statuses.length === 1) {
      query.status = statuses[0];
    } else if (statuses.length > 1) {
      query.status = { $in: statuses };
    }
  }

  // Filter by travel reimbursement
  if (travelReimbursement === "true") {
    query.travelReimbursement = true;
  } else if (travelReimbursement === "false") {
    query.travelReimbursement = false;
  } else if (travelReimbursement === "quebec") {
    // Travel reimbursement required AND located in Quebec
    const quebecCities = getQuebecCities();
    query.travelReimbursement = true;
    query.country = "CA";
    query.city = { $in: quebecCities };
  } else if (travelReimbursement === "outside-quebec") {
    // Travel reimbursement required AND NOT located in Quebec
    const quebecCities = getQuebecCities();
    query.travelReimbursement = true;
    query.$or = [
      { country: { $ne: "CA" } },
      { country: "CA", city: { $nin: quebecCities } },
    ];
  } else if (travelReimbursement === "approved") {
    query.isTravelReimbursementApproved = true;
  } else if (travelReimbursement === "starred") {
    query.isStarred = true;
  }
  // Filter by assigned status
  if (assignedStatus === "assigned") {
    query.processedBy = { $ne: "Not processed" };
  } else if (assignedStatus === "not-assigned") {
    query.processedBy = "Not processed";
  }

  // Filter by specific reviewers (assignedTo)
  if (assignedTo) {
    const reviewers = assignedTo.split(",").filter(Boolean);
    if (reviewers.length > 0) {
      query.processedBy = { $in: reviewers };
    }
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
  travelReimbursement: string,
  assignedStatus: string,
  assignedTo: string,
  page: number,
  limit: number
): Promise<{
  applications: ApplicationTableRow[];
  pagination: PaginationInfo;
}> {
  const query = buildQuery(
    search,
    status,
    travelReimbursement,
    assignedStatus,
    undefined,
    assignedTo
  );

  const total = await Application.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const apps = await Application.find(
    query,
    "email firstName lastName status school processedBy processedAt travelReimbursementAmount travelReimbursementCurrency isTravelReimbursementApproved isStarred createdAt"
  )
    .sort({ createdAt: 1 })
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

  const query = buildQuery(
    search,
    status,
    travelReimbursement,
    assignedStatus,
    assignedIds
  );

  const total = await Application.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const apps = await Application.find(
    query,
    "email firstName lastName status school processedBy processedAt travelReimbursementAmount travelReimbursementCurrency isTravelReimbursementApproved isStarred createdAt"
  )
    .sort({ createdAt: 1 })
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
      const reviewers = await Admin.find({isSuperAdmin: false})
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
