import { describe, expect, it, vi } from "vitest";

import { createFindByIdMock } from "@/test/admin-lookup";

const applicationModel = vi.hoisted(() => ({ find: vi.fn() }));
const teamModel = vi.hoisted(() => ({ find: vi.fn() }));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: { findById: createFindByIdMock() } }));
vi.mock("@/repository/models/application", () => ({ default: applicationModel }));
vi.mock("@/repository/models/team", () => ({ default: teamModel }));

import * as stats from "@/app/api/(group)/stats/route";
import * as resumesExport from "@/app/api/(group)/resumes/export/route";
import { NON_SUPER_ADMIN_ID, adminCookie, buildRequest } from "@/test/http";

const app = (status: string) => ({
  status,
  school: "Concordia",
  shirtSize: "M",
  createdAt: new Date("2026-01-01"),
  dietaryRestrictions: [],
  processedBy: "Not processed",
  isStarred: false,
});

describe("GET /api/stats status counts (C4)", () => {
  it("folds legacy CheckedIn into Checked-in", async () => {
    applicationModel.find.mockResolvedValue([app("CheckedIn"), app("Checked-in"), app("Confirmed")]);
    teamModel.find.mockResolvedValue([]);

    const res = await stats.GET(buildRequest("/api/stats", { cookie: await adminCookie() }));
    const { data } = await res.json();

    expect(data.statusCounts["Checked-in"]).toBe(2);
    expect(data.statusCounts).not.toHaveProperty("CheckedIn");
    expect(data.statusCounts.Confirmed).toBe(1);
  });
});

describe("GET /api/resumes/export status filter (C4)", () => {
  it("queries both checked-in spellings for the 'all' status filter", async () => {
    const exec = vi.fn().mockResolvedValue([]);
    const lean = vi.fn(() => ({ exec }));
    const select = vi.fn(() => ({ lean }));
    applicationModel.find.mockReturnValue({ select });

    const res = await resumesExport.GET(
      buildRequest("/api/resumes/export?statusFilter=all", { cookie: await adminCookie({ isSuperAdmin: true }) }),
    );

    // No resumes found for the empty mocked result set -> early 404, before any GridFS/archiver work.
    expect(res.status).toBe(404);
    expect(applicationModel.find.mock.calls[0][0]).toEqual({
      status: { $in: ["Submitted", "Admitted", "Waitlisted", "Confirmed", "Checked-in", "CheckedIn"] },
      "resume.id": { $exists: true, $nin: [null, ""] },
    });
  });
});

describe("GET /api/stats redaction", () => {
  it("zeroes T-shirt and dietary counts for a regular reviewer", async () => {
    applicationModel.find.mockResolvedValue([{ ...app("Confirmed"), dietaryRestrictions: ['["vegan"]'] }]);
    teamModel.find.mockResolvedValue([]);

    const res = await stats.GET(buildRequest("/api/stats", { cookie: await adminCookie({ adminId: NON_SUPER_ADMIN_ID }) }));
    const { data } = await res.json();

    expect(data.tshirtCounts).toEqual({ S: 0, M: 0, L: 0, XL: 0 });
    expect(data.dietaryRestrictionsData.every((entry: { count: number }) => entry.count === 0)).toBe(true);
    expect(data.sensitiveVisible).toBe(false);
  });

  it("keeps T-shirt counts for a super admin", async () => {
    applicationModel.find.mockResolvedValue([app("Confirmed")]);
    teamModel.find.mockResolvedValue([]);

    const res = await stats.GET(buildRequest("/api/stats", { cookie: await adminCookie() }));
    const { data } = await res.json();

    expect(data.tshirtCounts.M).toBe(1);
    expect(data.sensitiveVisible).toBe(true);
  });

  it.each([
    ["JSON in a one-element array", ['["vegan","halal"]'], 1],
    ["an empty array", [], 0],
    ["a plain array", ["vegan", "halal"], 1],
    ["a JSON string", '["vegan","halal"]', 1],
    ["none", ["none"], 0],
  ])("counts dietary restrictions stored as %s", async (_label, stored, expected) => {
    applicationModel.find.mockResolvedValue([{ ...app("Confirmed"), dietaryRestrictions: stored }]);
    teamModel.find.mockResolvedValue([]);

    const res = await stats.GET(buildRequest("/api/stats", { cookie: await adminCookie() }));
    const { data } = await res.json();
    const count = (name: string) =>
      data.dietaryRestrictionsData.find((entry: { restriction: string }) => entry.restriction === name).count;

    expect([count("Vegan"), count("Halal")]).toEqual([expected, expected]);
  });
});

describe("stats routes error handling (L3)", () => {
  class DriverError extends Error {
    code = 11000;
    keyValue = { email: "ada@example.com" };
    constructor() {
      super("E11000 duplicate key ada@example.com");
      this.name = "MongoServerError";
    }
  }

  it.each([
    ["/api/stats", stats.GET],
  ])("%s logs only the error name and code and sends error: null", async (path, handler) => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    applicationModel.find.mockImplementation(() => {
      throw new DriverError();
    });

    const res = await handler(buildRequest(path, { cookie: await adminCookie() }));
    const text = await res.text();

    expect(res.status).toBe(500);
    expect(JSON.parse(text).error).toBeNull();
    expect(text).not.toContain("ada@example.com");
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("ada@example.com");
    expect(JSON.stringify(errorLog.mock.calls)).toContain("MongoServerError (code 11000)");
    errorLog.mockRestore();
  });

});
