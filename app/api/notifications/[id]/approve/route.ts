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
import { getAuthUser, forbiddenResponse } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { eq, inArray } from "drizzle-orm";
import { sendMessage } from "@/lib/notifications/provider";
import { resolveTemplateBody } from "@/lib/notifications/resolve-template";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(_request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return forbiddenResponse();

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const [notification] = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
  if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  if (notification.status !== "awaiting_approval") {
    return NextResponse.json({ error: "Notification is not awaiting approval." }, { status: 400 });
  }

  const metadata = notification.metadata as { audienceId?: number; recipientIds?: number[] } | null;
  if (!metadata?.audienceId || !metadata?.recipientIds?.length) {
    return NextResponse.json({ error: "Notification has no audience data." }, { status: 400 });
  }

  const [audience] = await db.select().from(audiences).where(eq(audiences.id, metadata.audienceId)).limit(1);
  if (!audience) return NextResponse.json({ error: "Audience not found" }, { status: 404 });

  const [template] = await db.select().from(templates).where(eq(templates.id, notification.templateId)).limit(1);
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const members = await db.select().from(recipients).where(inArray(recipients.id, metadata.recipientIds));
  const [settingsRow] = await db.select().from(systemSettings).limit(1);
  const scopeMappings = (settingsRow?.scopeMappings as Record<string, { phone?: string; name?: string }>) ?? {};

  let sentCount = 0;
  let lastProviderId: string | null = null;
  for (const recipient of members) {
    const body = resolveTemplateBody(
      template.templateBody,
      recipient as unknown as Record<string, unknown>,
      audience.scope,
      scopeMappings
    );
    const result = await sendMessage({
      to: (recipient as { phone: string }).phone,
      body,
      messageType: notification.messageType as "sms" | "whatsapp",
    });
    if (result.ok) {
      sentCount++;
      if (result.providerId) lastProviderId = result.providerId;
    }
  }

  const status = sentCount === members.length ? "sent" : sentCount > 0 ? "sent" : "failed";
  const [updated] = await db
    .update(notifications)
    .set({
      status,
      approvedBy: user.id,
      serviceProviderId: lastProviderId,
      sentAt: new Date(),
    })
    .where(eq(notifications.id, id))
    .returning();

  await logAudit(user.id, "approve", "notification", id);
  return NextResponse.json({
    notification: updated,
    message: status === "sent" ? `Approved and sent to ${sentCount} recipient(s).` : sentCount > 0 ? `Sent to ${sentCount} of ${members.length}.` : "Sending failed.",
  });
}
