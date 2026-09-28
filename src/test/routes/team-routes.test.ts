import { vi } from "vitest";

import { createFindByIdMock } from "@/test/admin-lookup";

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: { findById: createFindByIdMock() } }));
vi.mock("@/repository/models/application", () => ({ default: {} }));
vi.mock("@/repository/models/team", () => ({ default: {} }));

import * as teamById from "@/app/api/(group)/teams/[teamId]/route";
import * as addMember from "@/app/api/(group)/teams/add-member/route";
import * as createTeam from "@/app/api/(group)/teams/create/route";
import * as paginated from "@/app/api/(group)/teams/paginated/route";
import * as removeMember from "@/app/api/(group)/teams/remove-member/route";
import * as teams from "@/app/api/(group)/teams/route";
import * as searchUsers from "@/app/api/(group)/teams/search-users/route";
import { runGuardCases } from "@/test/guard-cases";

const TEAM_ID = "64d000000000000000000001";

runGuardCases([
  { name: "DELETE /api/teams/[teamId]", handler: teamById.DELETE, method: "DELETE", url: `/api/teams/${TEAM_ID}`, level: "super", params: { teamId: TEAM_ID } },
  { name: "POST /api/teams/add-member", handler: addMember.POST, method: "POST", url: "/api/teams/add-member", level: "any" },
  { name: "POST /api/teams/create", handler: createTeam.POST, method: "POST", url: "/api/teams/create", level: "any" },
  { name: "GET /api/teams/paginated", handler: paginated.GET, method: "GET", url: "/api/teams/paginated", level: "any" },
  { name: "POST /api/teams/remove-member", handler: removeMember.POST, method: "POST", url: "/api/teams/remove-member", level: "super" },
  { name: "GET /api/teams", handler: teams.GET, method: "GET", url: "/api/teams", level: "any" },
  { name: "GET /api/teams/search-users", handler: searchUsers.GET, method: "GET", url: "/api/teams/search-users?q=a", level: "any" },
]);
