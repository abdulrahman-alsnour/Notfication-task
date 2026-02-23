import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  notifications,
  scheduledNotifications,
  systemSettings,
  audiences,
  audienceRecipients,
  recipients,
  templates,
} from "@/lib/db/schema";
import { getAuthUser } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { inArray } from "drizzle-orm";
import { sendMessage } from "@/lib/notifications/provider";
import { resolveTemplateBody } from "@/lib/notifications/resolve-template";

const LIMIT = 20;

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.trim() || undefined;
  const messageType = searchParams.get("messageType")?.trim()?.toLowerCase() || undefined;
  const fromDate = searchParams.get("fromDate")?.trim() || undefined;
  const toDate = searchParams.get("toDate")?.trim() || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  const conditions: ReturnType<typeof eq>[] = [];
  if (status) conditions.push(eq(notifications.status, status));
  if (messageType === "sms" || messageType === "whatsapp") conditions.push(eq(notifications.messageType, messageType));
  if (fromDate) {
    const from = new Date(fromDate);
    if (!Number.isNaN(from.getTime())) conditions.push(gte(notifications.createdAt, from));
  }
  if (toDate) {
    const to = new Date(toDate);
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      conditions.push(lte(notifications.createdAt, to));
    }
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const offset = (page - 1) * LIMIT;
  const [list, countRows] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(LIMIT)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(notifications).where(where),
  ]);
  const total = countRows[0]?.count ?? 0;

  const templateIds = Array.from(new Set(list.map((n) => n.templateId)));
  const templatesList =
    templateIds.length > 0
      ? await db.select().from(templates).where(inArray(templates.id, templateIds))
      : [];
  const templateMap = Object.fromEntries(templatesList.map((t) => [t.id, t]));

  const items = list.map((n) => ({
    ...n,
    template: templateMap[n.templateId] ?? null,
  }));

  return NextResponse.json({
    notifications: items,
    total,
    page,
    limit: LIMIT,
    totalPages: Math.ceil(total / LIMIT) || 1,
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const audienceId = typeof b.audienceId === "number" ? b.audienceId : parseInt(String(b.audienceId ?? ""), 10);
  const templateId = typeof b.templateId === "number" ? b.templateId : parseInt(String(b.templateId ?? ""), 10);
  const messageType = typeof b.messageType === "string" ? b.messageType.trim().toLowerCase() : "";
  const schedule = b.schedule === true ? (b as { schedule: true; scheduledAt?: string }) : null;

  const errors: string[] = [];
  if (!title) errors.push("Title is required.");
  if (Number.isNaN(audienceId) || audienceId < 1) errors.push("Audience is required.");
  if (Number.isNaN(templateId) || templateId < 1) errors.push("Template is required.");
  if (messageType !== "sms" && messageType !== "whatsapp") errors.push("Message type must be sms or whatsapp.");
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const [audience] = await db.select().from(audiences).where(eq(audiences.id, audienceId)).limit(1);
  if (!audience) return NextResponse.json({ error: "Audience not found" }, { status: 404 });

  const [template] = await db.select().from(templates).where(eq(templates.id, templateId)).limit(1);
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  if (template.objectType !== audience.scope) {
    return NextResponse.json(
      { error: "Template scope does not match audience scope. Choose a template for the same scope." },
      { status: 400 }
    );
  }

  const memberRows = await db
    .select({ recipientId: audienceRecipients.recipientId })
    .from(audienceRecipients)
    .where(eq(audienceRecipients.audienceId, audienceId));
  const recipientIds = memberRows.map((r) => r.recipientId);
  const members = recipientIds.length > 0
    ? await db.select().from(recipients).where(inArray(recipients.id, recipientIds))
    : [];

  if (members.length === 0) {
    return NextResponse.json({ error: "Audience has no recipients." }, { status: 400 });
  }

  const [settingsRow] = await db.select().from(systemSettings).limit(1);
  const approvalEnabled = settingsRow?.approvalEnabled ?? false;
  const scopeMappings = (settingsRow?.scopeMappings as Record<string, { phone?: string; name?: string }>) ?? {};

  if (schedule && schedule.scheduledAt) {
    const scheduledAt = new Date(schedule.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      return NextResponse.json({ error: "Scheduled time must be in the future." }, { status: 400 });
    }
    const status = approvalEnabled ? "awaiting_approval" : "pending";
    const [scheduled] = await db
      .insert(scheduledNotifications)
      .values({
        title,
        objectType: audience.scope,
        templateId,
        recipientCount: members.length,
        messageType,
        status,
        scheduledAt,
        metadata: { audienceId, recipientIds },
        createdBy: user.id,
      })
      .returning();
    if (scheduled) await logAudit(user.id, "create", "scheduled_notification", scheduled.id, { title, status });
    return NextResponse.json({
      scheduled: true,
      notification: scheduled,
      message: approvalEnabled
        ? "Scheduled notification created and is awaiting approval."
        : "Scheduled notification created.",
    });
  }

  if (approvalEnabled) {
    const [created] = await db
      .insert(notifications)
      .values({
        title,
        objectType: audience.scope,
        templateId,
        recipientCount: members.length,
        messageType,
        status: "awaiting_approval",
        metadata: { audienceId, recipientIds },
        createdBy: user.id,
      })
      .returning();
    if (created) await logAudit(user.id, "create", "notification", created.id, { title, status: "awaiting_approval" });
    return NextResponse.json({
      notification: created,
      message: "Notification created and is awaiting approval before it will be sent.",
    });
  }

  let sentCount = 0;
  let lastProviderId: string | null = null;
  for (const recipient of members) {
    const body = resolveTemplateBody(template.templateBody, recipient as unknown as Record<string, unknown>, audience.scope, scopeMappings);
    const phone = (recipient as { phone: string }).phone;
    const result = await sendMessage({
      to: phone,
      body,
      messageType: messageType as "sms" | "whatsapp",
    });
    if (result.ok) {
      sentCount++;
      if (result.providerId) lastProviderId = result.providerId;
    }
  }

  const status = sentCount === members.length ? "sent" : sentCount > 0 ? "sent" : "failed";
  const [created] = await db
    .insert(notifications)
    .values({
      title,
      objectType: audience.scope,
      templateId,
      recipientCount: members.length,
      messageType,
      status,
      serviceProviderId: lastProviderId,
      metadata: { audienceId, recipientIds },
      createdBy: user.id,
      sentAt: status === "sent" ? new Date() : null,
    })
    .returning();

  if (created) await logAudit(user.id, "send", "notification", created.id, { title, status });
  return NextResponse.json({
    notification: created,
    message: status === "sent" ? `Notification sent to ${sentCount} recipient(s).` : sentCount > 0 ? `Sent to ${sentCount} of ${members.length}.` : "Sending failed.",
  });
}
