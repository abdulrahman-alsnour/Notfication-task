import { db } from "@/lib/db";
import {
  scheduledNotifications,
  audiences,
  recipients,
  templates,
  systemSettings,
} from "@/lib/db/schema";
import { eq, and, lte, inArray } from "drizzle-orm";
import { sendMessage } from "@/lib/notifications/provider";
import { resolveTemplateBody } from "@/lib/notifications/resolve-template";


export async function processScheduledNotifications(): Promise<void> {
  const now = new Date();
  const due = await db
    .select()
    .from(scheduledNotifications)
    .where(
      and(
        eq(scheduledNotifications.status, "pending"),
        lte(scheduledNotifications.scheduledAt, now)
      )
    );

  for (const scheduled of due) {
    const metadata = scheduled.metadata as { audienceId?: number; recipientIds?: number[] } | null;
    if (!metadata?.audienceId || !metadata?.recipientIds?.length) {
      await db
        .update(scheduledNotifications)
        .set({ status: "failed" })
        .where(eq(scheduledNotifications.id, scheduled.id));
      continue;
    }

    const [audience] = await db.select().from(audiences).where(eq(audiences.id, metadata.audienceId)).limit(1);
    if (!audience) {
      await db
        .update(scheduledNotifications)
        .set({ status: "failed" })
        .where(eq(scheduledNotifications.id, scheduled.id));
      continue;
    }

    const [template] = await db.select().from(templates).where(eq(templates.id, scheduled.templateId)).limit(1);
    if (!template) {
      await db
        .update(scheduledNotifications)
        .set({ status: "failed" })
        .where(eq(scheduledNotifications.id, scheduled.id));
      continue;
    }

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
    await db
      .update(scheduledNotifications)
      .set({
        status,
        serviceProviderId: lastProviderId,
        sentAt: new Date(),
      })
      .where(eq(scheduledNotifications.id, scheduled.id));
  }
}
