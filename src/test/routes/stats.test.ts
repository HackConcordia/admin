import { describe, expect, it, vi } from "vitest";

const applicationModel = vi.hoisted(() => ({ find: vi.fn() }));
const teamModel = vi.hoisted(() => ({ find: vi.fn() }));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/application", () => ({ default: applicationModel }));
vi.mock("@/repository/models/team", () => ({ default: teamModel }));

import * as ageDistribution from "@/app/api/(group)/stats/age-distribution/route";
import * as stats from "@/app/api/(group)/stats/route";
import * as resumesExport from "@/app/api/(group)/resumes/export/route";
import { adminCookie, buildRequest } from "@/test/http";

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

describe("GET /api/stats/age-distribution (C4)", () => {
  it("includes applicants stored with the legacy CheckedIn value", async () => {
    const lean = vi.fn().mockResolvedValue([]);
    const sort = vi.fn(() => ({ lean }));
    applicationModel.find.mockReturnValue({ sort });

    const res = await ageDistribution.GET(buildRequest("/api/stats/age-distribution", { cookie: await adminCookie() }));

    expect(res.status).toBe(200);
    expect(applicationModel.find.mock.calls[0][0]).toEqual({ status: { $in: ["Confirmed", "Checked-in", "CheckedIn"] } });
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
