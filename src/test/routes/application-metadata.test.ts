import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFindByIdMock } from "@/test/admin-lookup";

const applicationModel = vi.hoisted(() => ({ findById: vi.fn(), findByIdAndUpdate: vi.fn() }));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: { findById: createFindByIdMock() } }));
vi.mock("@/repository/models/application", () => ({ default: applicationModel }));

import * as metadata from "@/app/api/(group)/application/[applicationId]/metadata/route";
import { adminCookie, buildRequest, routeContext } from "@/test/http";

const APP_ID = "64c000000000000000000001";

async function patch(body: unknown, id = APP_ID) {
  return metadata.PATCH(
    buildRequest(`/api/application/${id}/metadata`, { method: "PATCH", cookie: await adminCookie(), body }),
    routeContext({ applicationId: id }),
  );
}

beforeEach(() => {
  applicationModel.findById.mockResolvedValue({ _id: APP_ID });
  applicationModel.findByIdAndUpdate.mockResolvedValue({ comments: "ok", skillTags: ["react"] });
});

describe("PATCH /api/application/[applicationId]/metadata", () => {
  it("trims and saves comments and skill tags", async () => {
    const res = await patch({ comments: "  good fit  ", skillTags: [" react ", ""] });

    expect(res.status).toBe(200);
    expect(applicationModel.findByIdAndUpdate.mock.calls[0][1].$set).toEqual({ comments: "good fit", skillTags: ["react"] });
  });

  it("caps comments at 5000 characters, like the super-admin edit", async () => {
    expect((await patch({ comments: "c".repeat(5000) })).status).toBe(200);
    const res = await patch({ comments: "c".repeat(5001) });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ message: "comments must be 5000 characters or fewer", error: null });
  });

  it.each([
    [{ comments: 42 }, "comments must be a string"],
    [{ skillTags: "react" }, "skillTags must be a list of strings"],
    [{ skillTags: [1] }, "skillTags must be a list of strings"],
    [{ skillTags: ["t".repeat(201)] }, "skillTags must be 200 characters or fewer"],
  ])("rejects %j", async (body, message) => {
    const res = await patch(body);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ message });
    expect(applicationModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("answers 400 for a malformed id", async () => {
    expect((await patch({ comments: "x" }, "nope")).status).toBe(400);
  });
});
