import { afterEach, describe, expect, it, vi } from "vitest";

import { createFindByIdMock } from "@/test/admin-lookup";

const applicationModel = vi.hoisted(() => ({ findById: vi.fn(), findByIdAndUpdate: vi.fn() }));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: { findById: createFindByIdMock() } }));
vi.mock("@/repository/models/application", () => ({ default: applicationModel }));

import * as star from "@/app/api/(group)/application/[applicationId]/star/route";
import { adminCookie, buildRequest, routeContext } from "@/test/http";

const APP_ID = "64c000000000000000000001";

async function patch(id: string, body: unknown) {
  return star.PATCH(
    buildRequest(`/api/application/${id}/star`, { method: "PATCH", cookie: await adminCookie(), body }),
    routeContext({ applicationId: id }),
  );
}

afterEach(() => vi.restoreAllMocks());

describe("PATCH /api/application/[id]/star", () => {
  it("answers 400 for a malformed id without querying the database", async () => {
    const res = await patch("not-an-object-id", { isStarred: true });
    expect(res.status).toBe(400);
    expect(applicationModel.findById).not.toHaveBeenCalled();
  });

  it("answers 400 for a body that is not valid JSON", async () => {
    const res = await star.PATCH(
      new (await import("next/server")).NextRequest(new URL(`/api/application/${APP_ID}/star`, "http://localhost"), {
        method: "PATCH",
        headers: { cookie: await adminCookie() },
        body: "{not json",
      }),
      routeContext({ applicationId: APP_ID }),
    );
    expect(res.status).toBe(400);
  });

  it("logs only the error name and code, and sends error: null", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    applicationModel.findById.mockRejectedValue(Object.assign(new Error("secret applicant@test.dev"), { code: 11000 }));

    const res = await patch(APP_ID, { isStarred: true });

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeNull();
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toContain("applicant@test.dev");
    expect(logged).toContain("11000");
  });
});
