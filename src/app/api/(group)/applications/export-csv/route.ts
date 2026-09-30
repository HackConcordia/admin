import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { CSV_FIELDS, CSV_STATUS_FILTERS, buildApplicationsCsv, csvStatusQuery, isCsvStatusFilter } from "@/lib/conuhacks/applications-csv";
import { requireAdmin } from "@/lib/require-admin";
import Application from "@/repository/models/application";
import connectMongoDB from "@/repository/mongoose";
import { sendErrorResponse } from "@/repository/response";

export const dynamic = "force-dynamic";

export const GET = async (req: NextRequest) => {
  const auth = await requireAdmin(req, { superAdmin: true });
  if (!auth.ok) return auth.response;

  const filter = new URL(req.url).searchParams.get("status") ?? "all";
  if (!isCsvStatusFilter(filter)) {
    return sendErrorResponse(`Invalid status filter. Must be one of: ${CSV_STATUS_FILTERS.join(", ")}`, null, 400);
  }

  try {
    await connectMongoDB();
    const docs = await Application.find(csvStatusQuery(filter)).select(CSV_FIELDS).sort({ createdAt: 1 }).lean();
    const csv = buildApplicationsCsv(docs as Record<string, unknown>[]);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="conuhacks-xi-applications-${filter}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to export applications CSV:", error instanceof Error ? error.name : "unknown error");
    return sendErrorResponse("Failed to export applications", null, 500);
  }
};
