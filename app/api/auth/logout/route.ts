import { NextResponse } from "next/server";
import { getAuthCookieName } from "@/lib/auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(getAuthCookieName(), "", {
    path: "/",
    maxAge: 0,
  });
  return response;
}
