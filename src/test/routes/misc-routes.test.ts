import { vi } from "vitest";

import { createFindByIdMock } from "@/test/admin-lookup";

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: { findById: createFindByIdMock() } }));
vi.mock("@/repository/models/application", () => ({ default: {} }));
vi.mock("@/repository/models/meal", () => ({ default: {} }));
vi.mock("@/repository/models/settings", () => ({ default: {} }));
vi.mock("@/repository/models/team", () => ({ default: {} }));

import * as files from "@/app/api/(group)/files/[fileId]/route";
import * as meals from "@/app/api/(group)/meals/route";
import * as resumeExport from "@/app/api/(group)/resumes/export/route";
import * as getSettings from "@/app/api/(group)/settings/get-settings/route";
import * as advanced from "@/app/api/(group)/stats/advanced/route";
import * as ageDistribution from "@/app/api/(group)/stats/age-distribution/route";
import * as stats from "@/app/api/(group)/stats/route";
import { runGuardCases } from "@/test/guard-cases";

const FILE_ID = "64e000000000000000000001";

runGuardCases([
  { name: "GET /api/stats", handler: stats.GET, method: "GET", url: "/api/stats", level: "any" },
  { name: "GET /api/stats/advanced", handler: advanced.GET, method: "GET", url: "/api/stats/advanced", level: "any" },
  { name: "GET /api/stats/age-distribution", handler: ageDistribution.GET, method: "GET", url: "/api/stats/age-distribution", level: "super" },
  { name: "GET /api/settings/get-settings", handler: getSettings.GET, method: "GET", url: "/api/settings/get-settings", level: "any" },
  { name: "GET /api/meals", handler: meals.GET, method: "GET", url: "/api/meals", level: "any" },
  { name: "POST /api/meals", handler: meals.POST, method: "POST", url: "/api/meals", level: "any" },
  { name: "PUT /api/meals", handler: meals.PUT, method: "PUT", url: "/api/meals", level: "any" },
  { name: "GET /api/files/[fileId]", handler: files.GET, method: "GET", url: `/api/files/${FILE_ID}`, level: "any", params: { fileId: FILE_ID } },
  { name: "GET /api/resumes/export", handler: resumeExport.GET, method: "GET", url: "/api/resumes/export", level: "super" },
]);
