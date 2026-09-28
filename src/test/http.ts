import { NextRequest } from "next/server";

import { COOKIE_NAME, signAuthToken } from "@/lib/auth-token";

export const TEST_ADMIN_ID = "64b000000000000000000001";
export const OTHER_ADMIN_ID = "64b000000000000000000002";
export const TEST_ADMIN_EMAIL = "reviewer@test.dev";

// Route handlers have heterogeneous signatures; tests call them uniformly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouteHandler = (req: any, context: any) => Promise<Response>;

export async function adminCookie(
  options: { isSuperAdmin?: boolean; adminId?: string; email?: string } = {},
): Promise<string> {
  const token = await signAuthToken(
    {
      adminId: options.adminId ?? TEST_ADMIN_ID,
      email: options.email ?? TEST_ADMIN_EMAIL,
      isSuperAdmin: options.isSuperAdmin ?? false,
    },
    false,
  );
  return `${COOKIE_NAME}=${token}`;
}

export function buildRequest(
  path: string,
  init: { method?: string; cookie?: string; body?: unknown; headers?: Record<string, string> } = {},
): NextRequest {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set("cookie", init.cookie);
  if (init.body !== undefined) headers.set("content-type", "application/json");

  return new NextRequest(new URL(path, "http://localhost"), {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function routeContext(params: Record<string, string> = {}): any {
  return { params: Promise.resolve(params) };
}
