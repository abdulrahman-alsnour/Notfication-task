import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  scheduledNotifications,
  templates,
  audiences,
  recipients,
  systemSettings,
} from "@/lib/db/schema";
import { getAuthUser, forbiddenResponse } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { eq, inArray } from "drizzle-orm";
import { sendMessage } from "@/lib/notifications/provider";
import { resolveTemplateBody } from "@/lib/notifications/resolve-template";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(_request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const [scheduled] = await db.select().from(scheduledNotifications).where(eq(scheduledNotifications.id, id)).limit(1);
  if (!scheduled) return NextResponse.json({ error: "Scheduled notification not found" }, { status: 404 });

  const [template] = await db.select().from(templates).where(eq(templates.id, scheduled.templateId)).limit(1);
  const metadata = scheduled.metadata as { audienceId?: number; recipientIds?: number[] } | null;
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
    scheduled,
    template: template ?? null,
    audience,
    members,
  });
}

export async function PATCH(
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
  const action = typeof b.action === "string" ? b.action.trim().toLowerCase() : "";

  if ((action === "approve" || action === "reject") && user.role !== "admin") {
    return forbiddenResponse();
  }

  const [scheduled] = await db.select().from(scheduledNotifications).where(eq(scheduledNotifications.id, id)).limit(1);
  if (!scheduled) return NextResponse.json({ error: "Scheduled notification not found" }, { status: 404 });

  if (action === "cancel") {
    if (scheduled.status !== "pending" && scheduled.status !== "awaiting_approval") {
      return NextResponse.json({ error: "Only pending or awaiting-approval scheduled notifications can be cancelled." }, { status: 400 });
    }
    const [updated] = await db
      .update(scheduledNotifications)
      .set({ status: "cancelled" })
      .where(eq(scheduledNotifications.id, id))
      .returning();
    await logAudit(user.id, "delete", "scheduled_notification", id, { previousStatus: scheduled.status });
    return NextResponse.json({ scheduled: updated, message: "Scheduled notification cancelled." });
  }

  if (action === "reject") {
    if (scheduled.status !== "awaiting_approval") {
      return NextResponse.json({ error: "Only awaiting-approval scheduled notifications can be rejected." }, { status: 400 });
    }
    const reason = typeof b.reason === "string" ? b.reason.trim() : null;
    const [updated] = await db
      .update(scheduledNotifications)
      .set({
        status: "rejected",
        rejectedBy: user.id,
        rejectionReason: reason,
      })
      .where(eq(scheduledNotifications.id, id))
      .returning();
    await logAudit(user.id, "reject", "scheduled_notification", id, { reason: reason ?? undefined });
    return NextResponse.json({ scheduled: updated, message: "Scheduled notification rejected." });
  }

  if (action === "approve") {
    if (scheduled.status !== "awaiting_approval") {
      return NextResponse.json({ error: "Only awaiting-approval scheduled notifications can be approved." }, { status: 400 });
    }
    const metadata = scheduled.metadata as { audienceId?: number; recipientIds?: number[] } | null;
    if (!metadata?.audienceId || !metadata?.recipientIds?.length) {
      return NextResponse.json({ error: "Scheduled notification has no audience data." }, { status: 400 });
    }

    const [audience] = await db.select().from(audiences).where(eq(audiences.id, metadata.audienceId)).limit(1);
    if (!audience) return NextResponse.json({ error: "Audience not found" }, { status: 404 });

    const [template] = await db.select().from(templates).where(eq(templates.id, scheduled.templateId)).limit(1);
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
        messageType: scheduled.messageType as "sms" | "whatsapp",
      });
      if (result.ok) {
        sentCount++;
        if (result.providerId) lastProviderId = result.providerId;
      }
    }

    const status = sentCount === members.length ? "sent" : sentCount > 0 ? "sent" : "failed";
    const [updated] = await db
      .update(scheduledNotifications)
      .set({
        status,
        approvedBy: user.id,
        serviceProviderId: lastProviderId,
        sentAt: new Date(),
      })
      .where(eq(scheduledNotifications.id, id))
      .returning();

    await logAudit(user.id, "approve", "scheduled_notification", id);
    return NextResponse.json({
      scheduled: updated,
      message: status === "sent" ? `Approved and sent to ${sentCount} recipient(s).` : sentCount > 0 ? `Sent to ${sentCount} of ${members.length}.` : "Sending failed.",
    });
  }

  return NextResponse.json({ error: "Invalid action. Use cancel, approve, or reject." }, { status: 400 });
}
