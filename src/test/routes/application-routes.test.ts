import { vi } from "vitest";

import { createFindByIdMock } from "@/test/admin-lookup";

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: { findById: createFindByIdMock() } }));
vi.mock("@/repository/models/application", () => ({ default: {} }));
vi.mock("@/repository/models/checkin", () => ({ default: {} }));
vi.mock("@/utils/applicantEmails", () => ({ sendDiscordInviteEmail: vi.fn() }));

import * as applicationById from "@/app/api/(group)/application/[applicationId]/route";
import * as metadata from "@/app/api/(group)/application/[applicationId]/metadata/route";
import * as resume from "@/app/api/(group)/application/[applicationId]/resume/route";
import * as star from "@/app/api/(group)/application/[applicationId]/star/route";
import { runGuardCases } from "@/test/guard-cases";

const APP_ID = "64c000000000000000000001";
const params = { applicationId: APP_ID };

runGuardCases([
  { name: "GET /api/application/[id]", handler: applicationById.GET, method: "GET", url: `/api/application/${APP_ID}`, level: "any", params },
  { name: "PUT /api/application/[id]", handler: applicationById.PUT, method: "PUT", url: `/api/application/${APP_ID}`, level: "super", params },
  { name: "DELETE /api/application/[id]", handler: applicationById.DELETE, method: "DELETE", url: `/api/application/${APP_ID}`, level: "super", params },
  { name: "PATCH /api/application/[id]/metadata", handler: metadata.PATCH, method: "PATCH", url: `/api/application/${APP_ID}/metadata`, level: "any", params },
  { name: "POST /api/application/[id]/resume", handler: resume.POST, method: "POST", url: `/api/application/${APP_ID}/resume`, level: "super", params },
  { name: "DELETE /api/application/[id]/resume", handler: resume.DELETE, method: "DELETE", url: `/api/application/${APP_ID}/resume`, level: "super", params },
  { name: "PATCH /api/application/[id]/star", handler: star.PATCH, method: "PATCH", url: `/api/application/${APP_ID}/star`, level: "any", params },
]);
