import { SignJWT, decodeJwt } from "jose";
import { describe, expect, it } from "vitest";

import { COOKIE_MAX_AGE_SECONDS, SESSION_TOKEN_SECONDS, signAuthToken, verifyAuthToken } from "@/lib/auth-token";

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

  it("rejects a validly signed token with no exp claim", async () => {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "test-jwt-secret-0123456789-abcdefghijklmnop");
    const token = await new SignJWT({ ...PAYLOAD })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .setSubject(PAYLOAD.adminId)
      .sign(secret);
    await expect(verifyAuthToken(token)).resolves.toBeNull();
  });
});

describe("auth-token expiry", () => {
  it("expires a non-remembered token after 12 hours", async () => {
    const token = await signAuthToken(PAYLOAD, false);
    const { iat, exp } = decodeJwt(token);
    expect(exp! - iat!).toBe(SESSION_TOKEN_SECONDS);
    expect(SESSION_TOKEN_SECONDS).toBe(60 * 60 * 12);
  });

  it("expires a remembered token after 7 days", async () => {
    const token = await signAuthToken(PAYLOAD, true);
    const { iat, exp } = decodeJwt(token);
    expect(exp! - iat!).toBe(COOKIE_MAX_AGE_SECONDS);
    expect(COOKIE_MAX_AGE_SECONDS).toBe(60 * 60 * 24 * 7);
  });
});
