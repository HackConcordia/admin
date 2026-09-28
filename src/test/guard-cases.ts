import { describe, expect, it } from "vitest";

import { NON_SUPER_ADMIN_ID, adminCookie, buildRequest, routeContext, type RouteHandler } from "./http";

export type GuardLevel = "any" | "super";

export interface GuardCase {
  name: string;
  handler: RouteHandler;
  method: string;
  url: string;
  level: GuardLevel;
  params?: Record<string, string>;
}

/** Asserts every handler rejects anonymous/forged callers, and non-super callers when level is "super". */
export function runGuardCases(cases: readonly GuardCase[]): void {
  describe.each(cases)("$name", ({ handler, method, url, level, params }) => {
    it("returns 401 without a session cookie", async () => {
      const res = await handler(buildRequest(url, { method }), routeContext(params));
      expect(res.status).toBe(401);
    });

    it("returns 401 with a forged session cookie", async () => {
      const res = await handler(buildRequest(url, { method, cookie: "auth-token=forged.token.value" }), routeContext(params));
      expect(res.status).toBe(401);
    });

    if (level === "super") {
      it("returns 403 for a non-super admin", async () => {
        // The super-admin check is re-verified against the DB (require-admin.ts), not trusted
        // from the JWT claim, so this signs in as NON_SUPER_ADMIN_ID — the id every route test's
        // mocked Admin model resolves as "not a super admin" (see src/test/admin-lookup.ts).
        const cookie = await adminCookie({ adminId: NON_SUPER_ADMIN_ID, isSuperAdmin: true });
        const res = await handler(buildRequest(url, { method, cookie }), routeContext(params));
        expect(res.status).toBe(403);
      });
    }
  });
}
