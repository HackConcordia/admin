import { NextResponse } from "next/server";

import { COOKIE_NAME, verifyAuthToken, type AuthTokenPayload } from "@/lib/auth-token";
import connectMongoDB from "@/repository/mongoose";
import Admin from "@/repository/models/admin";

export type RequireAdminOptions = { superAdmin?: boolean };

export type RequireAdminResult =
  | { ok: true; admin: AuthTokenPayload }
  | { ok: false; response: NextResponse };

export function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== name) continue;

    const rawValue = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
}

function guardError(message: "Unauthorized" | "Forbidden", status: 401 | 403): NextResponse {
  return NextResponse.json({ status: "error", message, error: null }, { status });
}

/**
 * Verifies the admin session cookie on an API request.
 * Returns the verified token payload, or a ready-to-return 401/403 response.
 */
export async function requireAdmin(req: Request, options: RequireAdminOptions = {}): Promise<RequireAdminResult> {
  const token = readCookie(req.headers.get("cookie"), COOKIE_NAME);
  if (!token) {
    return { ok: false, response: guardError("Unauthorized", 401) };
  }

  const admin = await verifyAuthToken(token);
  if (!admin) {
    return { ok: false, response: guardError("Unauthorized", 401) };
  }

  if (options.superAdmin) {
    // Re-check super-admin status against the database on every call, rather than trusting the
    // JWT claim: a session issued while the admin was a super admin must stop granting super
    // access the moment they're demoted or deleted, without waiting for the token to expire.
    await connectMongoDB();
    const record = await Admin.findById(admin.adminId).select("isSuperAdmin").lean<{ isSuperAdmin?: boolean }>();

    if (!record) {
      return { ok: false, response: guardError("Unauthorized", 401) };
    }
    if (!record.isSuperAdmin) {
      return { ok: false, response: guardError("Forbidden", 403) };
    }
  }

  return { ok: true, admin };
}
