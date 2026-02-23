import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
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

  const [template] = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  return NextResponse.json({ template });
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
  const objectType = typeof b.objectType === "string" ? b.objectType.trim() : "";
  const templateBody = typeof b.templateBody === "string" ? b.templateBody.trim() : "";
  const templateFields = b.templateFields;
  const placeholderConfigs = b.placeholderConfigs;

  const errors: string[] = [];
  if (!name) errors.push("Name is required.");
  if (!objectType) errors.push("Scope (object type) is required.");
  if (!templateBody) errors.push("Template body is required.");
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const [updated] = await db
    .update(templates)
    .set({
      name,
      objectType,
      templateBody,
      templateFields: templateFields ?? undefined,
      placeholderConfigs: placeholderConfigs ?? undefined,
    })
    .where(eq(templates.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  await logAudit(user.id, "update", "template", id, { name, objectType });
  return NextResponse.json({ template: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(_request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const [deleted] = await db.delete(templates).where(eq(templates.id, id)).returning({ id: templates.id });
  if (!deleted) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  await logAudit(user.id, "delete", "template", id);
  return NextResponse.json({ ok: true });
}
