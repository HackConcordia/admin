import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { DISCORD_API_KEY_HEADER } from "@/lib/api-key";
import { COOKIE_NAME, signAuthToken } from "@/lib/auth-token";
import { apiAuthMiddleware } from "@/middleware/api-auth";

async function sessionCookie(): Promise<string> {
  const token = await signAuthToken({ adminId: "64b000000000000000000001", email: "a@test.dev", isSuperAdmin: false }, false);
  return `${COOKIE_NAME}=${token}`;
}

function request(path: string, headers: Record<string, string> = {}, method = "GET"): NextRequest {
  return new NextRequest(new URL(path, "http://localhost"), { method, headers });
}

const isPassThrough = (res: Response) => res.headers.get("x-middleware-next") === "1";

describe("apiAuthMiddleware", () => {
  it("rejects an API call without a session with a 401 envelope", async () => {
    const res = await apiAuthMiddleware(request("/api/stats"));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ status: "error", message: "Unauthorized", error: null });
  });

  it("rejects a forged session cookie", async () => {
    const res = await apiAuthMiddleware(request("/api/stats", { cookie: `${COOKIE_NAME}=a.b.c` }));
    expect(res.status).toBe(401);
  });

  it("passes a valid session through", async () => {
    const res = await apiAuthMiddleware(request("/api/stats", { cookie: await sessionCookie() }));
    expect(isPassThrough(res)).toBe(true);
  });

  it("leaves login and logout public", async () => {
    expect(isPassThrough(await apiAuthMiddleware(request("/api/auth-token/login", {}, "POST")))).toBe(true);
    expect(isPassThrough(await apiAuthMiddleware(request("/api/auth-token/logout", {}, "POST")))).toBe(true);
  });

  it("requires the API key (not a session) for check-in-discord", async () => {
    const path = "/api/check-in-discord/someone@example.com";
    expect((await apiAuthMiddleware(request(path, { cookie: await sessionCookie() }))).status).toBe(401);
    expect((await apiAuthMiddleware(request(path, { [DISCORD_API_KEY_HEADER]: "wrong" }))).status).toBe(401);
    const ok = await apiAuthMiddleware(request(path, { [DISCORD_API_KEY_HEADER]: process.env.DISCORD_BOT_API_KEY! }));
    expect(isPassThrough(ok)).toBe(true);
  });
});
