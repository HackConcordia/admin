/**
 * age, phoneNumber, shirtSize, dietary answers, gender, pronouns and underrepresented
 * (SUPER_ADMIN_ONLY_FIELD_KEYS) must never reach a regular reviewer's browser through any route that
 * returns an application document, not just be hidden by the view.
 */
import { describe, expect, it, vi } from "vitest";

import { createFindByIdMock } from "@/test/admin-lookup";

const applicationModel = vi.hoisted(() => ({ findById: vi.fn(), findByIdAndUpdate: vi.fn() }));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: { findById: createFindByIdMock() } }));
vi.mock("@/repository/models/application", () => ({ default: applicationModel }));
vi.mock("@/repository/models/checkin", () => ({ default: {} }));
vi.mock("@/utils/admissionEmailConfig", () => ({ sendDiscordLink: vi.fn() }));

import * as applicationById from "@/app/api/(group)/application/[applicationId]/route";
import * as star from "@/app/api/(group)/application/[applicationId]/star/route";
import * as userByApplication from "@/app/api/(group)/users/[applicationId]/route";
import { NON_SUPER_ADMIN_ID, adminCookie, buildRequest, routeContext, type RouteHandler } from "@/test/http";

const APP_ID = "64c000000000000000000001";
const DOC = {
  _id: APP_ID,
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@test.dev",
  status: "Submitted",
  discipline: "data-science",
  age: "under-18",
  phoneNumber: "5145550000",
  shirtSize: "XL",
  dietaryRestrictions: ['["vegan"]'],
  dietaryRestrictionsDescription: "No sesame",
  gender: "female",
  pronouns: "she/her",
  underrepresented: "Unsure",
  resume: { size: 0 },
};
const SECRETS = ["under-18", "5145550000", "XL", "vegan", "No sesame", "female", "she/her", "Unsure"];

const CASES: { name: string; handler: RouteHandler; method: string; url: string; body?: unknown; arrange: () => void }[] = [
  {
    name: "GET /api/application/[id]",
    handler: applicationById.GET,
    method: "GET",
    url: `/api/application/${APP_ID}`,
    arrange: () => applicationModel.findById.mockResolvedValue({ toObject: () => DOC }),
  },
  {
    name: "PATCH /api/application/[id]/star",
    handler: star.PATCH,
    method: "PATCH",
    url: `/api/application/${APP_ID}/star`,
    body: { isStarred: true },
    arrange: () => {
      applicationModel.findById.mockResolvedValue({ _id: APP_ID });
      applicationModel.findByIdAndUpdate.mockResolvedValue({ toObject: () => ({ ...DOC, isStarred: true }) });
    },
  },
  {
    name: "GET /api/users/[applicationId]",
    handler: userByApplication.GET,
    method: "GET",
    url: `/api/users/${APP_ID}`,
    arrange: () => applicationModel.findById.mockResolvedValue({ resume: { size: 0 }, toObject: () => DOC }),
  },
];

describe.each(CASES)("$name", ({ handler, method, url, body, arrange }) => {
  it("sends no super-admin-only value to a regular reviewer", async () => {
    arrange();
    const cookie = await adminCookie({ adminId: NON_SUPER_ADMIN_ID });
    const res = await handler(buildRequest(url, { method, cookie, body }), routeContext({ applicationId: APP_ID }));
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(text).toContain("data-science");
    for (const secret of SECRETS) expect(text).not.toContain(secret);
  });

  it("sends everything to a super admin", async () => {
    arrange();
    const res = await handler(buildRequest(url, { method, cookie: await adminCookie(), body }), routeContext({ applicationId: APP_ID }));
    const text = await res.text();

    expect(res.status).toBe(200);
    for (const secret of SECRETS) expect(text).toContain(secret);
  });
});
