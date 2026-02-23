import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  notifications,
  templates,
  audiences,
  audienceRecipients,
  recipients,
  systemSettings,
} from "@/lib/db/schema";
import { getAuthUser } from "@/lib/api-auth";
import { eq, inArray } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(_request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const [notification] = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
  if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 });

  const [template] = await db.select().from(templates).where(eq(templates.id, notification.templateId)).limit(1);
  const metadata = notification.metadata as { audienceId?: number; recipientIds?: number[] } | null;
  let audience = null;
  let members: unknown[] = [];
  if (metadata?.audienceId) {
    const [a] = await db.select().from(audiences).where(eq(audiences.id, metadata.audienceId)).limit(1);
    audience = a ?? null;
    if (metadata.recipientIds?.length) {
      members = await db.select().from(recipients).where(inArray(recipients.id, metadata.recipientIds));
    }
  }

  return NextResponse.json({
    notification,
    template: template ?? null,
    audience,
    members,
  });
}
