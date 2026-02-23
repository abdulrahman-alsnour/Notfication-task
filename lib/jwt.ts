import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "auth_token";

function getSecret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || "default-secret-change-me"
  );
}

export async function createToken(payload: {
  userId: number;
  username: string;
}): Promise<string> {
  return new SignJWT({
    sub: String(payload.userId),
    username: payload.username,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<{
  userId: number;
  username: string;
} | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = payload.sub ? parseInt(payload.sub as string, 10) : null;
    const username = payload.username as string;
    if (!userId || !username) return null;
    return { userId, username };
  } catch {
    return null;
  }
}

export function getAuthCookieName(): string {
  return COOKIE_NAME;
}

export function getAuthCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  path: string;
  maxAge: number;
  sameSite: "lax";
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  };
}
