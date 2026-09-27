import { SignJWT, jwtVerify } from "jose";

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;
export const SESSION_TOKEN_SECONDS = 60 * 60 * 12;

export type AuthTokenPayload = {
  adminId: string;
  email: string;
  isSuperAdmin: boolean;
};

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    (process.env.NODE_ENV !== "production" ? "dev-secret-change-me" : "");
  if (!secret) {
    throw new Error("JWT secret is not configured. Set JWT_SECRET in your environment.");
  }
  return new TextEncoder().encode(secret);
}

export async function signAuthToken(payload: AuthTokenPayload, rememberFor30Days: boolean): Promise<string> {
  const secret = getJwtSecret();
  const issuedAt = Math.floor(Date.now() / 1000);
  const lifetimeSeconds = rememberFor30Days ? THIRTY_DAYS_SECONDS : SESSION_TOKEN_SECONDS;

  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(issuedAt)
    .setSubject(payload.adminId)
    .setExpirationTime(issuedAt + lifetimeSeconds)
    .sign(secret);
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"], requiredClaims: ["exp"] });
    if (typeof payload.adminId !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return {
      adminId: payload.adminId,
      email: payload.email,
      isSuperAdmin: payload.isSuperAdmin === true,
    };
  } catch (_err) {
    return null;
  }
}

export const COOKIE_NAME = "auth-token";
export const COOKIE_MAX_AGE_SECONDS = THIRTY_DAYS_SECONDS;
