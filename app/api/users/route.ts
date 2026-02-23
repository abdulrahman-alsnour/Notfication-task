import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getAuthUser, forbiddenResponse } from "@/lib/api-auth";
import { desc, sql } from "drizzle-orm";

const LIMIT = 20;

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const offset = (page - 1) * LIMIT;

  const [list, countRows] = await Promise.all([
    db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(LIMIT)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(users),
  ]);
  const total = countRows[0]?.count ?? 0;

  return NextResponse.json({
    users: list,
    total,
    page,
    limit: LIMIT,
    totalPages: Math.ceil(total / LIMIT) || 1,
  });
}
