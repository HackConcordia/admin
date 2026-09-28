import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { defaultSuperAdminLookup } from "@/test/admin-lookup";

// `findById`'s implementation is a nested closure so the reference to `defaultSuperAdminLookup`
// (imported from another module) is only resolved when a test actually calls it, after this
// file's imports have fully loaded — vi.hoisted's own factory runs before that.
const adminModel = vi.hoisted(() => ({
  findById: vi.fn((id: string) => ({ select: () => ({ lean: async () => defaultSuperAdminLookup(id) }) })),
}));

const volunteerModel = vi.hoisted(() => ({
  find: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: adminModel }));
vi.mock("@/repository/models/volunteer", () => ({ default: volunteerModel }));

import * as volunteers from "@/app/api/(group)/volunteers/route";
import { runGuardCases } from "@/test/guard-cases";
import { NON_SUPER_ADMIN_ID, adminCookie, buildRequest } from "@/test/http";

const VOLUNTEER_ID = "64c000000000000000000001";
const SECOND_VOLUNTEER_ID = "64c000000000000000000002";
const THIRD_VOLUNTEER_ID = "64c000000000000000000003";
const STORED_HASH = "$2b$12$abcdefghijklmnopqrstuuW4b0mXcq9u6n5b3oX9Zl1dQn0H8p2i";
const LEGACY_PLAINTEXT = "legacy-plaintext-pw";
const NEW_VOLUNTEER = { firstName: " Grace ", lastName: "Hopper", email: "  Grace.Hopper@Test.DEV " };
const PUBLIC_KEYS = ["_id", "email", "firstName", "lastName", "needsPasswordReset"];

runGuardCases([
  { name: "GET /api/volunteers", handler: volunteers.GET, method: "GET", url: "/api/volunteers", level: "super" },
  { name: "POST /api/volunteers", handler: volunteers.POST, method: "POST", url: "/api/volunteers", level: "super" },
]);

function mockVolunteerList(records: Record<string, unknown>[]) {
  const lean = vi.fn().mockResolvedValue(records);
  const sort = vi.fn(() => ({ lean }));
  const collation = vi.fn(() => ({ sort }));
  const select = vi.fn(() => ({ collation }));
  volunteerModel.find.mockReturnValue({ select });
  return { select, collation, sort };
}

function mockExistingVolunteer(record: Record<string, unknown> | null) {
  const lean = vi.fn().mockResolvedValue(record);
  const select = vi.fn(() => ({ lean }));
  const collation = vi.fn(() => ({ select }));
  volunteerModel.findOne.mockReturnValue({ collation });
  return { collation };
}

async function superCookie(): Promise<string> {
  return adminCookie({ isSuperAdmin: true });
}

describe("GET /api/volunteers", () => {
  it("lists volunteers sorted by name, without password fields, flagging non-bcrypt passwords", async () => {
    const chain = mockVolunteerList([
      { _id: VOLUNTEER_ID, firstName: "Ada", lastName: "Lovelace", email: "ada@test.dev", password: STORED_HASH },
      { _id: SECOND_VOLUNTEER_ID, firstName: "Alan", lastName: "Turing", email: "alan@test.dev", password: LEGACY_PLAINTEXT },
      { _id: THIRD_VOLUNTEER_ID, firstName: "Edsger", lastName: "Dijkstra", email: "edsger@test.dev" },
    ]);

    const res = await volunteers.GET(buildRequest("/api/volunteers", { cookie: await superCookie() }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(chain.collation).toHaveBeenCalledWith({ locale: "en", strength: 2 });
    expect(chain.sort).toHaveBeenCalledWith({ firstName: 1, lastName: 1 });

    const text = await res.text();
    expect(text).not.toContain(STORED_HASH);
    expect(text).not.toContain(LEGACY_PLAINTEXT);

    const body = JSON.parse(text);
    expect(body.status).toBe("success");
    expect(body.data).toEqual([
      { _id: VOLUNTEER_ID, firstName: "Ada", lastName: "Lovelace", email: "ada@test.dev", needsPasswordReset: false },
      { _id: SECOND_VOLUNTEER_ID, firstName: "Alan", lastName: "Turing", email: "alan@test.dev", needsPasswordReset: true },
      { _id: THIRD_VOLUNTEER_ID, firstName: "Edsger", lastName: "Dijkstra", email: "edsger@test.dev", needsPasswordReset: true },
    ]);
    for (const item of body.data) {
      expect(Object.keys(item).sort()).toEqual(PUBLIC_KEYS);
    }
  });

  it("never queries volunteers for a non-super admin", async () => {
    const cookie = await adminCookie({ adminId: NON_SUPER_ADMIN_ID, isSuperAdmin: true });
    const res = await volunteers.GET(buildRequest("/api/volunteers", { cookie }));

    expect(res.status).toBe(403);
    expect(volunteerModel.find).not.toHaveBeenCalled();
  });
});

describe("POST /api/volunteers", () => {
  it("stores a cost-12 bcrypt hash of a generated password and returns the password once", async () => {
    mockExistingVolunteer(null);
    volunteerModel.create.mockImplementation(async (doc: Record<string, unknown>) => ({ _id: VOLUNTEER_ID, ...doc }));

    const res = await volunteers.POST(
      buildRequest("/api/volunteers", {
        method: "POST",
        cookie: await superCookie(),
        body: { ...NEW_VOLUNTEER, password: "caller-chosen-password", isSuperAdmin: true },
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    const stored = volunteerModel.create.mock.calls[0][0] as Record<string, string | boolean>;
    expect(stored).toEqual({
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace.hopper@test.dev",
      password: expect.stringMatching(/^\$2[aby]\$12\$/),
      isSuperAdmin: false,
    });

    const text = await res.text();
    expect(text).not.toContain(stored.password as string);

    const body = JSON.parse(text);
    expect(body.data).toEqual({
      _id: VOLUNTEER_ID,
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace.hopper@test.dev",
      needsPasswordReset: false,
      generatedPassword: expect.stringMatching(/^[A-Za-z0-9_-]{16}$/),
    });
    expect(body.data.generatedPassword).not.toBe("caller-chosen-password");
    await expect(bcrypt.compare(body.data.generatedPassword, stored.password as string)).resolves.toBe(true);
  });

  it("rejects a duplicate email case-insensitively with 409", async () => {
    const chain = mockExistingVolunteer({ _id: VOLUNTEER_ID });

    const res = await volunteers.POST(
      buildRequest("/api/volunteers", { method: "POST", cookie: await superCookie(), body: NEW_VOLUNTEER }),
    );

    expect(res.status).toBe(409);
    expect((await res.json()).message).toBe("A volunteer with this email already exists");
    expect(volunteerModel.findOne).toHaveBeenCalledWith({ email: "grace.hopper@test.dev" });
    expect(chain.collation).toHaveBeenCalledWith({ locale: "en", strength: 2 });
    expect(volunteerModel.create).not.toHaveBeenCalled();
  });

  it("maps a duplicate-key error from a concurrent insert to 409", async () => {
    mockExistingVolunteer(null);
    volunteerModel.create.mockRejectedValue(
      Object.assign(new Error("E11000 duplicate key error"), { name: "MongoServerError", code: 11000 }),
    );

    const res = await volunteers.POST(
      buildRequest("/api/volunteers", { method: "POST", cookie: await superCookie(), body: NEW_VOLUNTEER }),
    );

    expect(res.status).toBe(409);
  });

  it.each([
    { firstName: "  ", lastName: "Hopper", email: "grace@test.dev" },
    { firstName: "Grace", email: "grace@test.dev" },
    { firstName: "Grace", lastName: "Hopper", email: "not-an-email" },
    { firstName: "Grace", lastName: "Hopper", email: { $ne: null } },
  ])("rejects an invalid body with 400 before touching the database (%j)", async (body) => {
    const res = await volunteers.POST(
      buildRequest("/api/volunteers", { method: "POST", cookie: await superCookie(), body }),
    );

    expect(res.status).toBe(400);
    expect(volunteerModel.findOne).not.toHaveBeenCalled();
    expect(volunteerModel.create).not.toHaveBeenCalled();
  });

  it("rejects a body that isn't JSON with 400", async () => {
    const req = new NextRequest(new URL("/api/volunteers", "http://localhost"), {
      method: "POST",
      headers: { cookie: await superCookie(), "content-type": "application/json" },
      body: "{not json",
    });

    const res = await volunteers.POST(req);

    expect(res.status).toBe(400);
    expect(volunteerModel.create).not.toHaveBeenCalled();
  });

  it("never touches volunteers for a non-super admin", async () => {
    const cookie = await adminCookie({ adminId: NON_SUPER_ADMIN_ID, isSuperAdmin: true });
    const res = await volunteers.POST(buildRequest("/api/volunteers", { method: "POST", cookie, body: NEW_VOLUNTEER }));

    expect(res.status).toBe(403);
    expect(volunteerModel.findOne).not.toHaveBeenCalled();
    expect(volunteerModel.create).not.toHaveBeenCalled();
  });
});
