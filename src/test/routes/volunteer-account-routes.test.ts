import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";

import { defaultSuperAdminLookup } from "@/test/admin-lookup";

// `findById`'s implementation is a nested closure so the reference to `defaultSuperAdminLookup`
// (imported from another module) is only resolved when a test actually calls it, after this
// file's imports have fully loaded — vi.hoisted's own factory runs before that.
const adminModel = vi.hoisted(() => ({
  findById: vi.fn((id: string) => ({ select: () => ({ lean: async () => defaultSuperAdminLookup(id) }) })),
}));

const volunteerModel = vi.hoisted(() => ({
  findByIdAndUpdate: vi.fn(),
  findByIdAndDelete: vi.fn(),
}));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: adminModel }));
vi.mock("@/repository/models/volunteer", () => ({ default: volunteerModel }));

import * as volunteerById from "@/app/api/(group)/volunteers/[volunteerId]/route";
import * as resetPassword from "@/app/api/(group)/volunteers/[volunteerId]/reset-password/route";
import { runGuardCases } from "@/test/guard-cases";
import { NON_SUPER_ADMIN_ID, adminCookie, buildRequest, routeContext, type RouteHandler } from "@/test/http";

const VOLUNTEER_ID = "64c000000000000000000001";
const RESET_URL = `/api/volunteers/${VOLUNTEER_ID}/reset-password`;
const DELETE_URL = `/api/volunteers/${VOLUNTEER_ID}`;

runGuardCases([
  {
    name: "DELETE /api/volunteers/[volunteerId]",
    handler: volunteerById.DELETE,
    method: "DELETE",
    url: DELETE_URL,
    level: "super",
    params: { volunteerId: VOLUNTEER_ID },
  },
  {
    name: "POST /api/volunteers/[volunteerId]/reset-password",
    handler: resetPassword.POST,
    method: "POST",
    url: RESET_URL,
    level: "super",
    params: { volunteerId: VOLUNTEER_ID },
  },
]);

type PasswordUpdate = { $set: { password: string } };

/** Simulates Mongo applying the update and returning the new document ({ new: true }). */
function mockUpdateReturnsNewDocument(): void {
  volunteerModel.findByIdAndUpdate.mockImplementation(async (id: string, update: PasswordUpdate) => ({
    _id: id,
    firstName: "Grace",
    lastName: "Hopper",
    email: "grace@test.dev",
    password: update.$set.password,
  }));
}

async function superCookie(): Promise<string> {
  return adminCookie({ isSuperAdmin: true });
}

async function resetAsSuperAdmin(): Promise<Response> {
  return resetPassword.POST(
    buildRequest(RESET_URL, { method: "POST", cookie: await superCookie() }),
    routeContext({ volunteerId: VOLUNTEER_ID }),
  );
}

const ROUTES: { name: string; handler: RouteHandler; method: string }[] = [
  { name: "DELETE /api/volunteers/[volunteerId]", handler: volunteerById.DELETE, method: "DELETE" },
  { name: "POST /api/volunteers/[volunteerId]/reset-password", handler: resetPassword.POST, method: "POST" },
];

describe.each(ROUTES)("$name", ({ handler, method }) => {
  it("rejects a malformed volunteer id with 400 before touching the database", async () => {
    const res = await handler(
      buildRequest("/api/volunteers/not-an-id", { method, cookie: await superCookie() }),
      routeContext({ volunteerId: "not-an-id" }),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe("Invalid volunteer id");
    expect(volunteerModel.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(volunteerModel.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it("never touches volunteers for a non-super admin", async () => {
    const cookie = await adminCookie({ adminId: NON_SUPER_ADMIN_ID, isSuperAdmin: true });
    const res = await handler(buildRequest(DELETE_URL, { method, cookie }), routeContext({ volunteerId: VOLUNTEER_ID }));

    expect(res.status).toBe(403);
    expect(volunteerModel.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(volunteerModel.findByIdAndDelete).not.toHaveBeenCalled();
  });
});

describe("POST /api/volunteers/[volunteerId]/reset-password", () => {
  it("stores a cost-12 hash of a new generated password and returns the password once", async () => {
    mockUpdateReturnsNewDocument();

    const res = await resetAsSuperAdmin();

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    const [id, update, options] = volunteerModel.findByIdAndUpdate.mock.calls[0] as [string, PasswordUpdate, unknown];
    expect(id).toBe(VOLUNTEER_ID);
    expect(Object.keys(update.$set)).toEqual(["password"]);
    expect(update.$set.password).toMatch(/^\$2[aby]\$12\$/);
    expect(options).toEqual({ new: true, projection: { firstName: 1, lastName: 1, email: 1, password: 1 } });

    const text = await res.text();
    expect(text).not.toContain(update.$set.password);

    const body = JSON.parse(text);
    expect(body.data).toEqual({
      _id: VOLUNTEER_ID,
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@test.dev",
      needsPasswordReset: false,
      generatedPassword: expect.stringMatching(/^[A-Za-z0-9_-]{16}$/),
    });
    await expect(bcrypt.compare(body.data.generatedPassword, update.$set.password)).resolves.toBe(true);
  });

  it("changes the password and the hash on every reset", async () => {
    mockUpdateReturnsNewDocument();

    const first = await (await resetAsSuperAdmin()).json();
    const second = await (await resetAsSuperAdmin()).json();
    const firstHash = (volunteerModel.findByIdAndUpdate.mock.calls[0][1] as PasswordUpdate).$set.password;
    const secondHash = (volunteerModel.findByIdAndUpdate.mock.calls[1][1] as PasswordUpdate).$set.password;

    expect(second.data.generatedPassword).not.toBe(first.data.generatedPassword);
    expect(secondHash).not.toBe(firstHash);
    await expect(bcrypt.compare(first.data.generatedPassword, secondHash)).resolves.toBe(false);
  });

  it("returns 404 when the volunteer does not exist", async () => {
    volunteerModel.findByIdAndUpdate.mockResolvedValue(null);

    const res = await resetAsSuperAdmin();

    expect(res.status).toBe(404);
    expect((await res.json()).message).toBe("Volunteer not found");
  });
});

describe("DELETE /api/volunteers/[volunteerId]", () => {
  it("deletes the volunteer and returns only the id and email", async () => {
    volunteerModel.findByIdAndDelete.mockResolvedValue({ _id: VOLUNTEER_ID, email: "grace@test.dev" });

    const res = await volunteerById.DELETE(
      buildRequest(DELETE_URL, { method: "DELETE", cookie: await superCookie() }),
      routeContext({ volunteerId: VOLUNTEER_ID }),
    );

    expect(res.status).toBe(200);
    expect(volunteerModel.findByIdAndDelete).toHaveBeenCalledWith(VOLUNTEER_ID, { projection: { email: 1 } });
    expect((await res.json()).data).toEqual({ _id: VOLUNTEER_ID, email: "grace@test.dev" });
  });

  it("returns 404 when the volunteer does not exist", async () => {
    volunteerModel.findByIdAndDelete.mockResolvedValue(null);

    const res = await volunteerById.DELETE(
      buildRequest(DELETE_URL, { method: "DELETE", cookie: await superCookie() }),
      routeContext({ volunteerId: VOLUNTEER_ID }),
    );

    expect(res.status).toBe(404);
    expect((await res.json()).message).toBe("Volunteer not found");
  });
});
