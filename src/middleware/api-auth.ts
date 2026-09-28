import { NextResponse, type NextRequest } from "next/server";

import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";

export const PUBLIC_API_PATHS: ReadonlySet<string> = new Set(["/api/auth-token/login", "/api/auth-token/logout"]);

function unauthorized(): NextResponse {
  return NextResponse.json({ status: "error", message: "Unauthorized", error: null }, { status: 401 });
}

/**
 * Edge gate for every /api request. Route handlers still call requireAdmin()
 * (defense in depth, and it is where super-admin checks happen).
 */
export async function apiAuthMiddleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  if (PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const admin = token ? await verifyAuthToken(token) : null;
  return admin ? NextResponse.next() : unauthorized();
}
