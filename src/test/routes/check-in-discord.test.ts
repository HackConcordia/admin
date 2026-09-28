import { describe, expect, it, vi } from "vitest";

const checkInModel = vi.hoisted(() => ({ findOne: vi.fn(), findByIdAndUpdate: vi.fn() }));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/checkin", () => ({ default: checkInModel }));

import * as discord from "@/app/api/(group)/check-in-discord/[email]/route";
import { DISCORD_API_KEY_HEADER } from "@/lib/api-key";
import { adminCookie, buildRequest, routeContext } from "@/test/http";

const EMAIL = "hacker@test.dev";
const url = `/api/check-in-discord/${EMAIL}`;
const ctx = () => routeContext({ email: EMAIL });

describe("/api/check-in-discord/[email]", () => {
  it.each(["GET", "PATCH"] as const)("%s returns 401 without the API key", async (method) => {
    const handler = method === "GET" ? discord.GET : discord.PATCH;
    expect((await handler(buildRequest(url, { method }), ctx())).status).toBe(401);
    expect((await handler(buildRequest(url, { method, headers: { [DISCORD_API_KEY_HEADER]: "wrong" } }), ctx())).status).toBe(401);
  });

  it("does not accept an admin session instead of the key", async () => {
    const res = await discord.GET(buildRequest(url, { cookie: await adminCookie({ isSuperAdmin: true }) }), ctx());
    expect(res.status).toBe(401);
  });

  it("serves the request with the right key", async () => {
    checkInModel.findOne.mockResolvedValue(null);
    const res = await discord.GET(buildRequest(url, { headers: { [DISCORD_API_KEY_HEADER]: process.env.DISCORD_BOT_API_KEY! } }), ctx());
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ code: 404 });
  });
});
