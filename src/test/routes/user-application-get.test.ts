import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFindByIdMock } from "@/test/admin-lookup";

const applicationModel = vi.hoisted(() => ({ findById: vi.fn() }));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: { findById: createFindByIdMock() } }));
vi.mock("@/repository/models/application", () => ({ default: applicationModel }));

import * as userByApplication from "@/app/api/(group)/users/[applicationId]/route";
import { adminCookie, buildRequest, routeContext } from "@/test/http";

const APP_ID = "64c000000000000000000001";

async function get(id: string) {
  return userByApplication.GET(
    buildRequest(`/api/users/${id}`, { method: "GET", cookie: await adminCookie() }),
    routeContext({ applicationId: id }),
  );
}

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => undefined));

describe("GET /api/users/[applicationId]", () => {
  it("answers 400 for a malformed id without touching the database", async () => {
    const res = await get("not-an-id");

    expect(res.status).toBe(400);
    expect(applicationModel.findById).not.toHaveBeenCalled();
  });

  it("answers 404 with a null error for a missing application", async () => {
    applicationModel.findById.mockResolvedValue(null);
    const res = await get(APP_ID);

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBeNull();
  });

  it("logs only the error name and sends error: null on a failure", async () => {
    applicationModel.findById.mockRejectedValue(Object.assign(new Error("secret ada@test.dev"), { code: 11000 }));
    const res = await get(APP_ID);

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeNull();
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).toContain("Error (code 11000)");
    expect(logged).not.toContain("ada@test.dev");
  });
});
