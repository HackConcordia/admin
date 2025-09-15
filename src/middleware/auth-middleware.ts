import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";

export async function authMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;

  let isAuthenticated = false;
  if (token) {
    const payload = await verifyAuthToken(token);
    isAuthenticated = !!payload;
  }

  const isDashboardPath = pathname.startsWith("/dashboard");
  const isAuthPath = pathname.startsWith("/auth/");
  const loginPath = "/auth/v1/login";

  if (!isAuthenticated && isDashboardPath) {
    return NextResponse.redirect(new URL(loginPath, req.url));
  }

  if (isAuthenticated && isAuthPath) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}
