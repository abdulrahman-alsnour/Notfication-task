import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, getAuthCookieName } from "@/lib/jwt";

const PUBLIC_PATHS = ["/login", "/register"];
const AUTH_API_PREFIX = "/api/auth";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isAuthApi(pathname: string): boolean {
  return pathname.startsWith(AUTH_API_PREFIX);
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname) || isAuthApi(pathname)) {
    return NextResponse.next();
  }

  // Let all /api/* requests through so route handlers can return 401 JSON when unauthenticated
  if (isApiPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(getAuthCookieName())?.value;
  if (!token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set(getAuthCookieName(), "", { path: "/", maxAge: 0 });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
