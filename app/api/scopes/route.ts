import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scopes } from "@/lib/db/schema";
import { getAuthUser, forbiddenResponse } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await db.select().from(scopes).orderBy(scopes.code);
  return NextResponse.json({ scopes: list });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return forbiddenResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const code = typeof b.code === "string" ? b.code.trim() : "";
  const displayName = typeof b.displayName === "string" ? b.displayName.trim() : "";
  const icon = typeof b.icon === "string" ? b.icon.trim() || null : null;

  const errors: string[] = [];
  if (!code) errors.push("Code is required.");
  if (!displayName) errors.push("Display name is required.");
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const [existing] = await db.select().from(scopes).where(eq(scopes.code, code)).limit(1);
  if (existing) return NextResponse.json({ error: "A scope with this code already exists." }, { status: 409 });

  const [created] = await db.insert(scopes).values({ code, displayName, icon }).returning();
  if (created) await logAudit(user.id, "create", "scope", created.id, { code, displayName });
  return NextResponse.json({ scope: created });
}
