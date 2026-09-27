import { NextRequest } from "next/server";

import { apiAuthMiddleware } from "./middleware/api-auth";
import { authMiddleware } from "./middleware/auth-middleware";

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return apiAuthMiddleware(req);
  }
  return authMiddleware(req);
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*", "/api/:path*"],
};
