import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audiences, audienceRecipients } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { eq, ilike, and, desc, sql } from "drizzle-orm";

const LIMIT = 20;

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope")?.trim() || undefined;
  const search = searchParams.get("search")?.trim() || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  let where = undefined;
  if (scope || search) {
    const conditions = [];
    if (scope) conditions.push(eq(audiences.scope, scope));
    if (search) conditions.push(ilike(audiences.name, `%${search}%`));
    where = conditions.length === 1 ? conditions[0] : and(...conditions);
  }

  const offset = (page - 1) * LIMIT;

  const [list, countRows] = await Promise.all([
    db
      .select()
      .from(audiences)
      .where(where)
      .orderBy(desc(audiences.createdAt))
      .limit(LIMIT)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(audiences).where(where),
  ]);
  const total = countRows[0]?.count ?? 0;

  const withCount = await Promise.all(
    list.map(async (a) => {
      const count = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(audienceRecipients)
        .where(eq(audienceRecipients.audienceId, a.id));
      return { ...a, memberCount: count[0]?.c ?? 0 };
    })
  );

  return NextResponse.json({
    audiences: withCount,
    total,
    page,
    limit: LIMIT,
    totalPages: Math.ceil(total / LIMIT) || 1,
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const scope = typeof b.scope === "string" ? b.scope.trim() : "";
  const recipientIds = Array.isArray(b.recipientIds)
    ? (b.recipientIds as unknown[]).filter((x): x is number | string => typeof x === "number" || (typeof x === "string" && !Number.isNaN(parseInt(x, 10)))).map((x) => (typeof x === "number" ? x : parseInt(x, 10)))
    : [];

  const errors: string[] = [];
  if (!name) errors.push("Name is required.");
  if (!scope) errors.push("Scope is required.");
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const [created] = await db
    .insert(audiences)
    .values({
      name,
      scope,
      createdBy: user.id,
    })
    .returning({ id: audiences.id, name: audiences.name, scope: audiences.scope });

  if (!created) return NextResponse.json({ error: "Failed to create audience" }, { status: 500 });

  for (const rid of recipientIds) {
    await db.insert(audienceRecipients).values({
      audienceId: created.id,
      recipientId: rid,
    });
  }

  await logAudit(user.id, "create", "audience", created.id, { name, scope });
  return NextResponse.json({ audience: { ...created, memberCount: recipientIds.length } });
}
