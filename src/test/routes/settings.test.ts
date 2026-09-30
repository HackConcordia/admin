import { describe, expect, it, vi } from "vitest";

import { createFindByIdMock } from "@/test/admin-lookup";

const settingsModel = vi.hoisted(() => ({ findOne: vi.fn() }));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: { findById: createFindByIdMock() } }));
vi.mock("@/repository/models/settings", () => ({ default: settingsModel }));

import * as getSettings from "@/app/api/(group)/settings/get-settings/route";
import { adminCookie, buildRequest } from "@/test/http";

describe("GET /api/settings/get-settings", () => {
  it("returns known fields only, with Montreal display text for hand-written dates", async () => {
    settingsModel.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: "x", __v: 0, registrationClosingDate: "2027-01-20T23:59:00-05:00", maxCapacity: 600 }),
    });

    const res = await getSettings.GET(buildRequest("/api/settings/get-settings", { cookie: await adminCookie() }));

    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(Object.keys(data).sort()).toEqual(["dates", "maxCapacity"]);
    expect(data.dates.registrationClosingDate.display).toMatch(/January 20, 2027.*11:59\sPM.*EST/);
  });

  it("answers 200 with an empty view when no Settings document exists yet", async () => {
    settingsModel.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });

    const res = await getSettings.GET(buildRequest("/api/settings/get-settings", { cookie: await adminCookie() }));

    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.maxCapacity).toBeNull();
    expect(Object.values(data.dates).every((date) => (date as { stored: unknown }).stored === null)).toBe(true);
  });

  it("has no PATCH handler any more", () => {
    expect((getSettings as Record<string, unknown>).PATCH).toBeUndefined();
  });
});
