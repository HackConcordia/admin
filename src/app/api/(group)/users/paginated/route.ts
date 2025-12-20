import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
import Admin from "@/repository/models/admin";
import Application from "@/repository/models/application";
import connectMongoDB from "@/repository/mongoose";

type AuthPayload = {
  adminId?: string;
  isSuperAdmin?: boolean;
};

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

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromCookies();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const sortField = searchParams.get("sortField") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build the query
    const query: Record<string, any> = {};

    // Search by email (case-insensitive)
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

    // For non-super admins, filter by assigned applications
    let assignedIds: string[] = [];
    if (!auth.isSuperAdmin && auth.adminId) {
      const admin = await Admin.findById(auth.adminId).select("assignedApplications").lean().exec();
      if (!admin) {
        return NextResponse.json({
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
          isSuperAdmin: false,
        });
      }
      assignedIds = (admin as any).assignedApplications || [];
      if (assignedIds.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
          isSuperAdmin: false,
        });
      }
      query._id = { $in: assignedIds };
    }

    // Get total count for pagination
    const total = await Application.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    // Build sort object
    const sortOptions: Record<string, 1 | -1> = {};
    sortOptions[sortField] = sortOrder === "asc" ? 1 : -1;

    // Fetch paginated applications
    const applications = await Application.find(
      query,
      "email firstName lastName status createdAt processedBy processedAt"
    )
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    // Map to table format
    const data = (applications ?? []).map((a: any) => ({
      _id: String(a._id),
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email,
      status: a.status,
      createdAt: formatDateDDMMMYYYY(a.createdAt),
      processedBy: a.processedBy,
      processedAt: formatDateDDMMMYYYY(a.processedAt),
    }));

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      isSuperAdmin: auth.isSuperAdmin,
    });
  } catch (error) {
    console.error("[GET /api/users/paginated] Failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

