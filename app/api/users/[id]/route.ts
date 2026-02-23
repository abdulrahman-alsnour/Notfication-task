import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getAuthUser, forbiddenResponse } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(_request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return forbiddenResponse();

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const [u] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ user: u });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authUser.role !== "admin") return forbiddenResponse();

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const displayName = typeof b.displayName === "string" ? b.displayName.trim() || null : null;
  const email = typeof b.email === "string" ? b.email.trim() || null : null;
  const role = typeof b.role === "string" ? b.role.trim() || "user" : "user";
  const newPassword = typeof b.newPassword === "string" ? b.newPassword : undefined;

  const errors: string[] = [];
  if (newPassword !== undefined && newPassword.length < 6) errors.push("New password must be at least 6 characters.");
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const updates: { displayName?: string | null; email?: string | null; role?: string; passwordHash?: string } = {
    displayName,
    email,
    role,
  };
  if (newPassword) updates.passwordHash = await hashPassword(newPassword);

  const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning({
    id: users.id,
    username: users.username,
    displayName: users.displayName,
    email: users.email,
    role: users.role,
  });
  if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });
  await logAudit(authUser.id, "update", "user", id, { username: updated.username });
  return NextResponse.json({ user: updated });
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
  if (id === user.id) return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });

  const [deleted] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
  if (!deleted) return NextResponse.json({ error: "User not found" }, { status: 404 });
  await logAudit(user.id, "delete", "user", id);
  return NextResponse.json({ ok: true });
}
