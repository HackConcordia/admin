import { SignJWT, jwtVerify } from "jose";

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export type AuthTokenPayload = {
  adminId: string;
  email: string;
  isSuperAdmin: boolean;
  // Optional standard JWT claims like exp will be added during signing as needed
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
  const jwt = new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setSubject(payload.adminId);

  if (rememberFor30Days) {
    jwt.setExpirationTime(Math.floor(Date.now() / 1000) + THIRTY_DAYS_SECONDS);
  }

  return await jwt.sign(secret);
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return {
      adminId: String(payload.adminId),
      email: String(payload.email),
      isSuperAdmin: Boolean(payload.isSuperAdmin),
    };
  } catch (_err) {
    return null;
  }
}

export const COOKIE_NAME = "auth-token";
export const COOKIE_MAX_AGE_SECONDS = THIRTY_DAYS_SECONDS;
