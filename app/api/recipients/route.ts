import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recipients } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { eq, ilike, or, and, sql, desc } from "drizzle-orm";

const LIMIT = 20;

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope")?.trim() || undefined;
  const search = searchParams.get("search")?.trim() || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limitParam = parseInt(searchParams.get("limit") || "0", 10);
  const limit = limitParam > 0 ? Math.min(limitParam, 500) : LIMIT;

  let where = undefined;
  if (scope || search) {
    const conditions = [];
    if (scope) conditions.push(eq(recipients.scope, scope));
    if (search) {
      const term = `%${search}%`;
      conditions.push(or(ilike(recipients.name, term), ilike(recipients.phone, term))!);
    }
    where = conditions.length === 1 ? conditions[0] : and(...conditions);
  }

  const offset = (page - 1) * limit;
  const [list, countRows] = await Promise.all([
    db
      .select()
      .from(recipients)
      .where(where)
      .orderBy(desc(recipients.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(recipients).where(where),
  ]);
  const total = countRows[0]?.count ?? 0;

  return NextResponse.json({
    recipients: list,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
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
  const phone = typeof b.phone === "string" ? b.phone.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim() || null : null;
  const scope = typeof b.scope === "string" ? b.scope.trim() : "";
  const metadata = b.metadata;

  const errors: string[] = [];
  if (!name) errors.push("Name is required.");
  if (!phone) errors.push("Phone is required.");
  if (!scope) errors.push("Scope is required.");
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  try {
    const [created] = await db
      .insert(recipients)
      .values({ name, phone, email: email || null, scope, metadata: metadata ?? null })
      .returning();
    if (created) await logAudit(user.id, "create", "recipient", created.id, { name, scope });
    return NextResponse.json({ recipient: created });
  } catch (err: unknown) {
    const msg = err && typeof (err as { code?: string }).code === "string" && (err as { code: string }).code === "23505"
      ? "A recipient with this phone and scope already exists."
      : "Failed to create recipient.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
