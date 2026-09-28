import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";

const adminModel = vi.hoisted(() => ({ findOne: vi.fn() }));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: adminModel }));

import * as login from "@/app/api/(group)/auth-token/login/route";
import { TEST_ADMIN_ID, buildRequest } from "@/test/http";

const post = (body: unknown) => login.POST(buildRequest("/api/auth-token/login", { method: "POST", body }));

describe("POST /api/auth-token/login", () => {
  it("rejects non-string credentials (NoSQL operator injection)", async () => {
    const res = await post({ email: { $ne: null }, password: "x" });
    expect(res.status).toBe(400);
    expect(adminModel.findOne).not.toHaveBeenCalled();
  });

  it("uses the same message for unknown email and wrong password", async () => {
    adminModel.findOne.mockResolvedValueOnce(null);
    const unknown = await post({ email: "nobody@test.dev", password: "whatever1" });

    adminModel.findOne.mockResolvedValueOnce({ _id: TEST_ADMIN_ID, email: "a@test.dev", password: await bcrypt.hash("right pass", 4) });
    const wrong = await post({ email: "a@test.dev", password: "wrong pass" });

    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect((await unknown.json()).message).toBe("Invalid credentials");
    expect((await wrong.json()).message).toBe("Invalid credentials");
  });

  it("does not accept an unmigrated plaintext password", async () => {
    adminModel.findOne.mockResolvedValue({ _id: TEST_ADMIN_ID, email: "a@test.dev", password: "hunter22" });
    const res = await post({ email: "a@test.dev", password: "hunter22" });
    expect(res.status).toBe(401);
  });

  it("logs in with the right password and sets the session cookie", async () => {
    adminModel.findOne.mockResolvedValue({ _id: TEST_ADMIN_ID, email: "a@test.dev", isSuperAdmin: true, password: await bcrypt.hash("right pass", 4) });
    const res = await post({ email: "a@test.dev", password: "right pass", remember: false });
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("auth-token=");
    expect(res.headers.get("set-cookie")).toContain("HttpOnly");
  });
});
