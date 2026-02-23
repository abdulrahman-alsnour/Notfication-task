import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scopes, recipients } from "@/lib/db/schema";
import { getAuthUser, forbiddenResponse } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { eq, ne } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(_request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const [scope] = await db.select().from(scopes).where(eq(scopes.id, id)).limit(1);
  if (!scope) return NextResponse.json({ error: "Scope not found" }, { status: 404 });

  const [members, available] = await Promise.all([
    db.select().from(recipients).where(eq(recipients.scope, scope.code)),
    db.select().from(recipients).where(ne(recipients.scope, scope.code)).orderBy(recipients.name),
  ]);

  return NextResponse.json({ scope, recipients: members, availableRecipients: available });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return forbiddenResponse();

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

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

  const [existing] = await db.select().from(scopes).where(eq(scopes.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Scope not found" }, { status: 404 });

  const [dupe] = await db.select().from(scopes).where(eq(scopes.code, code)).limit(1);
  if (dupe && dupe.id !== id) return NextResponse.json({ error: "A scope with this code already exists." }, { status: 409 });

  if (code !== existing.code) {
    await db.update(recipients).set({ scope: code }).where(eq(recipients.scope, existing.code));
  }

  const [updated] = await db.update(scopes).set({ code, displayName, icon }).where(eq(scopes.id, id)).returning();
  await logAudit(user.id, "update", "scope", id, { code, displayName });
  return NextResponse.json({ scope: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(_request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return forbiddenResponse();

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const [scope] = await db.select().from(scopes).where(eq(scopes.id, id)).limit(1);
  if (!scope) return NextResponse.json({ error: "Scope not found" }, { status: 404 });

  const count = await db.select().from(recipients).where(eq(recipients.scope, scope.code));
  if (count.length > 0) {
    return NextResponse.json(
      { error: `Cannot delete scope: ${count.length} recipient(s) use it. Reassign or remove them first.` },
      { status: 400 }
    );
  }

  const [deleted] = await db.delete(scopes).where(eq(scopes.id, id)).returning({ id: scopes.id });
  if (!deleted) return NextResponse.json({ error: "Scope not found" }, { status: 404 });
  await logAudit(user.id, "delete", "scope", id, { code: scope.code });
  return NextResponse.json({ ok: true });
}
