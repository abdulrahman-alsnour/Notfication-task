import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recipients, audienceRecipients } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(_request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const [recipient] = await db.select().from(recipients).where(eq(recipients.id, id)).limit(1);
  if (!recipient) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  return NextResponse.json({ recipient });
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
    const [updated] = await db
      .update(recipients)
      .set({ name, phone, email: email || null, scope })
      .where(eq(recipients.id, id))
      .returning();
    if (!updated) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    await logAudit(user.id, "update", "recipient", id, { name, scope });
    return NextResponse.json({ recipient: updated });
  } catch (err: unknown) {
    const msg = err && typeof (err as { code?: string }).code === "string" && (err as { code: string }).code === "23505"
      ? "A recipient with this phone and scope already exists."
      : "Failed to update recipient.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(_request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  await db.delete(audienceRecipients).where(eq(audienceRecipients.recipientId, id));
  const [deleted] = await db.delete(recipients).where(eq(recipients.id, id)).returning({ id: recipients.id });
  if (!deleted) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  await logAudit(user.id, "delete", "recipient", id);
  return NextResponse.json({ ok: true });
}
