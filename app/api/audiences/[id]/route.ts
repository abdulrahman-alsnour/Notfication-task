import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audiences, audienceRecipients, recipients } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { eq, inArray } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(_request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const [audience] = await db.select().from(audiences).where(eq(audiences.id, id)).limit(1);
  if (!audience) return NextResponse.json({ error: "Audience not found" }, { status: 404 });

  const memberIds = await db
    .select({ recipientId: audienceRecipients.recipientId })
    .from(audienceRecipients)
    .where(eq(audienceRecipients.audienceId, id));

  const ids = memberIds.map((r) => r.recipientId);
  const members =
    ids.length > 0
      ? await db.select().from(recipients).where(inArray(recipients.id, ids))
      : [];

  return NextResponse.json({ audience, members });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

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
    ? (b.recipientIds as unknown[])
        .filter((x): x is number | string => typeof x === "number" || (typeof x === "string" && !Number.isNaN(parseInt(x as string, 10))))
        .map((x) => (typeof x === "number" ? x : parseInt(x, 10)))
    : undefined;

  const errors: string[] = [];
  if (!name) errors.push("Name is required.");
  if (!scope) errors.push("Scope is required.");
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const [existing] = await db.select().from(audiences).where(eq(audiences.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Audience not found" }, { status: 404 });

  await db
    .update(audiences)
    .set({ name, scope })
    .where(eq(audiences.id, id));

  if (recipientIds !== undefined) {
    await db.delete(audienceRecipients).where(eq(audienceRecipients.audienceId, id));
    for (const rid of recipientIds) {
      await db.insert(audienceRecipients).values({
        audienceId: id,
        recipientId: rid,
      });
    }
  }

  const [updated] = await db.select().from(audiences).where(eq(audiences.id, id)).limit(1);
  const memberIds = await db.select({ recipientId: audienceRecipients.recipientId }).from(audienceRecipients).where(eq(audienceRecipients.audienceId, id));

  await logAudit(user.id, "update", "audience", id, { name, scope });
  return NextResponse.json({
    audience: updated,
    memberCount: memberIds.length,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(_request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  await db.delete(audienceRecipients).where(eq(audienceRecipients.audienceId, id));
  const [deleted] = await db.delete(audiences).where(eq(audiences.id, id)).returning({ id: audiences.id });

  if (!deleted) return NextResponse.json({ error: "Audience not found" }, { status: 404 });
  await logAudit(user.id, "delete", "audience", id);
  return NextResponse.json({ ok: true });
}
