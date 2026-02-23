import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLog, users } from "@/lib/db/schema";
import { getAuthUser, forbiddenResponse } from "@/lib/api-auth";
import { desc, sql, inArray } from "drizzle-orm";

const LIMIT = 50;

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const offset = (page - 1) * LIMIT;

  try {
    const [rows, countRow] = await Promise.all([
      db
        .select({
          id: auditLog.id,
          userId: auditLog.userId,
          action: auditLog.action,
          entityType: auditLog.entityType,
          entityId: auditLog.entityId,
          details: auditLog.details,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .orderBy(desc(auditLog.createdAt))
        .limit(LIMIT)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(auditLog),
    ]);

    const total = Number(countRow[0]?.count ?? 0);
    const userIds = Array.from(new Set(rows.map((r) => r.userId).filter((id): id is number => id != null)));
    const usersList =
      userIds.length > 0 ? await db.select({ id: users.id, username: users.username }).from(users).where(inArray(users.id, userIds)) : [];

    const userMap = Object.fromEntries(usersList.map((u) => [u.id, u.username]));

    const entries = rows.map((r) => ({
      ...r,
      username: r.userId ? userMap[r.userId] ?? null : null,
    }));

    return NextResponse.json({
      entries,
      total,
      page,
      totalPages: Math.ceil(total / LIMIT) || 1,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("audit_log") && (msg.includes("does not exist") || msg.includes("relation"))) {
      return NextResponse.json(
        { error: "Audit log table not found. Run: npm run db:push" },
        { status: 503 }
      );
    }
    console.error("[audit] GET error:", err);
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
}
