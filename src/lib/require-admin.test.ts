import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const adminModel = vi.hoisted(() => ({ findById: vi.fn() }));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: adminModel }));

import { COOKIE_NAME, signAuthToken } from "@/lib/auth-token";
import { readCookie, requireAdmin } from "@/lib/require-admin";

const ADMIN = { adminId: "64b000000000000000000001", email: "admin@test.dev" };

function mockAdminLookup(result: { isSuperAdmin: boolean } | null): void {
  adminModel.findById.mockReturnValueOnce({ select: () => ({ lean: async () => result }) });
}

async function cookieFor(isSuperAdmin: boolean): Promise<string> {
  const token = await signAuthToken({ ...ADMIN, isSuperAdmin }, false);
  return `${COOKIE_NAME}=${token}`;
}

function nextRequest(cookie?: string): NextRequest {
  return new NextRequest("http://localhost/api/anything", { headers: cookie ? { cookie } : {} });
}

describe("readCookie", () => {
  it("returns null when the header is missing", () => {
    expect(readCookie(null, COOKIE_NAME)).toBeNull();
  });

  it("finds the cookie among several", () => {
    expect(readCookie("theme=dark; auth-token=abc.def.ghi; sidebar_state=true", COOKIE_NAME)).toBe("abc.def.ghi");
  });

  it("does not match a cookie whose name merely ends with the target", () => {
    expect(readCookie("not-auth-token=abc", COOKIE_NAME)).toBeNull();
  });
});

describe("requireAdmin", () => {
  it("returns a 401 envelope when no cookie is present", async () => {
    const result = await requireAdmin(nextRequest());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(401);
    await expect(result.response.json()).resolves.toEqual({ status: "error", message: "Unauthorized", error: null });
  });

  it("returns 401 for an invalid token", async () => {
    const result = await requireAdmin(nextRequest(`${COOKIE_NAME}=not-a-jwt`));
    expect(result.ok ? 200 : result.response.status).toBe(401);
  });

  it("returns the verified payload for a valid admin", async () => {
    const result = await requireAdmin(nextRequest(await cookieFor(false)));
    expect(result).toEqual({ ok: true, admin: { ...ADMIN, isSuperAdmin: false } });
  });

  it("works with a plain Request", async () => {
    const req = new Request("http://localhost/api/x", { headers: { cookie: await cookieFor(false) } });
    const result = await requireAdmin(req);
    expect(result.ok).toBe(true);
  });

  it("does not query the database for a non-super-admin check", async () => {
    adminModel.findById.mockClear();
    const result = await requireAdmin(nextRequest(await cookieFor(false)));
    expect(result.ok).toBe(true);
    expect(adminModel.findById).not.toHaveBeenCalled();
  });

  it("returns 403 when the DB says the admin is not a super admin, even though the token claims super", async () => {
    mockAdminLookup({ isSuperAdmin: false });
    const result = await requireAdmin(nextRequest(await cookieFor(true)), { superAdmin: true });
    expect(result.ok ? 200 : result.response.status).toBe(403);
  });

  it("returns 401 when the DB has no record for the admin (deleted)", async () => {
    mockAdminLookup(null);
    const result = await requireAdmin(nextRequest(await cookieFor(true)), { superAdmin: true });
    expect(result.ok ? 200 : result.response.status).toBe(401);
  });

  it("lets a super admin through a super-admin check when the DB confirms it", async () => {
    mockAdminLookup({ isSuperAdmin: true });
    const result = await requireAdmin(nextRequest(await cookieFor(true)), { superAdmin: true });
    expect(result).toEqual({ ok: true, admin: { ...ADMIN, isSuperAdmin: true } });
  });
});
