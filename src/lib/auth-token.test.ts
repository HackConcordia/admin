import { describe, expect, it } from "vitest";

import { signAuthToken, verifyAuthToken } from "@/lib/auth-token";

const PAYLOAD = { adminId: "64b000000000000000000001", email: "admin@test.dev", isSuperAdmin: true };

describe("auth-token", () => {
  it("round-trips a signed payload", async () => {
    const token = await signAuthToken(PAYLOAD, true);
    await expect(verifyAuthToken(token)).resolves.toEqual(PAYLOAD);
  });

  it("rejects a token whose payload was swapped", async () => {
    const token = await signAuthToken({ ...PAYLOAD, isSuperAdmin: false }, true);
    const [header, , signature] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ ...PAYLOAD, isSuperAdmin: true })).toString("base64url");
    await expect(verifyAuthToken(`${header}.${forgedPayload}.${signature}`)).resolves.toBeNull();
  });

  it("rejects garbage", async () => {
    await expect(verifyAuthToken("not-a-jwt")).resolves.toBeNull();
  });
});
