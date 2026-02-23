import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
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
    if (scope) conditions.push(eq(templates.objectType, scope));
    if (search) conditions.push(ilike(templates.name, `%${search}%`));
    where = conditions.length === 1 ? conditions[0] : and(...conditions);
  }

  const offset = (page - 1) * LIMIT;

  const [list, countRows] = await Promise.all([
    db
      .select()
      .from(templates)
      .where(where)
      .orderBy(desc(templates.createdAt))
      .limit(LIMIT)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(templates).where(where),
  ]);
  const total = countRows[0]?.count ?? 0;

  return NextResponse.json({
    templates: list,
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
  const objectType = typeof b.objectType === "string" ? b.objectType.trim() : "";
  const templateBody = typeof b.templateBody === "string" ? b.templateBody.trim() : "";
  const templateFields = b.templateFields;
  const placeholderConfigs = b.placeholderConfigs;

  const errors: string[] = [];
  if (!name) errors.push("Name is required.");
  if (!objectType) errors.push("Scope (object type) is required.");
  if (!templateBody) errors.push("Template body is required.");
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const [created] = await db
    .insert(templates)
    .values({
      name,
      objectType,
      templateBody,
      templateFields: templateFields ?? null,
      placeholderConfigs: placeholderConfigs ?? null,
      createdBy: user.id,
    })
    .returning();

  if (created) await logAudit(user.id, "create", "template", created.id, { name, objectType });
  return NextResponse.json({ template: created });
}
