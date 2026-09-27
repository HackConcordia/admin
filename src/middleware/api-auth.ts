import { NextResponse, type NextRequest } from "next/server";

import { hasValidDiscordApiKey } from "@/lib/api-key";
import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";

export const PUBLIC_API_PATHS: ReadonlySet<string> = new Set(["/api/auth-token/login", "/api/auth-token/logout"]);

export const API_KEY_PATH_PREFIXES: readonly string[] = ["/api/check-in-discord/"];

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

  if (API_KEY_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return hasValidDiscordApiKey(req) ? NextResponse.next() : unauthorized();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const admin = token ? await verifyAuthToken(token) : null;
  return admin ? NextResponse.next() : unauthorized();
}
