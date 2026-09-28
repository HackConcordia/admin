import { vi } from "vitest";

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: {} }));
vi.mock("@/repository/models/application", () => ({ default: {} }));
vi.mock("@/repository/models/meal", () => ({ default: {} }));
vi.mock("@/repository/models/team", () => ({ default: {} }));
vi.mock("@/repository/models/user", () => ({ default: {} }));

import * as userByApplication from "@/app/api/(group)/users/[applicationId]/route";
import * as count from "@/app/api/(group)/users/count/route";
import * as deleteUser from "@/app/api/(group)/users/delete-user/[userId]/route";
import * as userMeals from "@/app/api/(group)/users/meals/[userId]/route";
import * as paginated from "@/app/api/(group)/users/paginated/route";
import * as userResume from "@/app/api/(group)/users/resume/[userId]/route";
import * as users from "@/app/api/(group)/users/route";
import * as userTeam from "@/app/api/(group)/users/team/[applicationId]/route";
import { runGuardCases } from "@/test/guard-cases";

const ID = "64c000000000000000000001";

runGuardCases([
  { name: "GET /api/users/[applicationId]", handler: userByApplication.GET, method: "GET", url: `/api/users/${ID}`, level: "any", params: { applicationId: ID } },
  { name: "GET /api/users/count", handler: count.GET, method: "GET", url: "/api/users/count", level: "any" },
  { name: "DELETE /api/users/delete-user/[userId]", handler: deleteUser.DELETE, method: "DELETE", url: `/api/users/delete-user/${ID}`, level: "super", params: { userId: ID } },
  { name: "PATCH /api/users/meals/[userId]", handler: userMeals.PATCH, method: "PATCH", url: `/api/users/meals/${ID}`, level: "any", params: { userId: ID } },
  { name: "GET /api/users/paginated", handler: paginated.GET, method: "GET", url: "/api/users/paginated", level: "any" },
  { name: "GET /api/users/resume/[userId]", handler: userResume.GET, method: "GET", url: `/api/users/resume/${ID}`, level: "any", params: { userId: ID } },
  { name: "GET /api/users", handler: users.GET, method: "GET", url: "/api/users", level: "any" },
  { name: "GET /api/users/team/[applicationId]", handler: userTeam.GET, method: "GET", url: `/api/users/team/${ID}`, level: "any", params: { applicationId: ID } },
]);
