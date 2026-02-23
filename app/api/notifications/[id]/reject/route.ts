import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { getAuthUser, forbiddenResponse } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";

export async function POST(
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
    body = {};
  }
  const reason = typeof (body as { reason?: string }).reason === "string"
    ? (body as { reason: string }).reason.trim()
    : null;

  const [notification] = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
  if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  if (notification.status !== "awaiting_approval") {
    return NextResponse.json({ error: "Notification is not awaiting approval." }, { status: 400 });
  }

  const [updated] = await db
    .update(notifications)
    .set({
      status: "rejected",
      rejectedBy: user.id,
      rejectionReason: reason,
    })
    .where(eq(notifications.id, id))
    .returning();

  await logAudit(user.id, "reject", "notification", id, { reason: reason ?? undefined });
  return NextResponse.json({
    notification: updated,
    message: "Notification rejected.",
  });
}
