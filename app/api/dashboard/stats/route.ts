import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  notifications,
  scheduledNotifications,
  recipients,
  audiences,
  templates,
} from "@/lib/db/schema";
import { getAuthUser } from "@/lib/api-auth";
import { sql, gte, and, eq, isNotNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    notifByStatusRows,
    scheduledByStatusRows,
    totalRecipients,
    totalAudiences,
    totalTemplates,
    timeSeriesRaw,
    scheduledSentByDayRows,
  ] = await Promise.all([
    db
      .select({
        status: notifications.status,
        count: sql<number>`count(*)::int`,
      })
      .from(notifications)
      .groupBy(notifications.status),
    db
      .select({
        status: scheduledNotifications.status,
        count: sql<number>`count(*)::int`,
      })
      .from(scheduledNotifications)
      .groupBy(scheduledNotifications.status),
    db.select({ count: sql<number>`count(*)::int` }).from(recipients),
    db.select({ count: sql<number>`count(*)::int` }).from(audiences),
    db.select({ count: sql<number>`count(*)::int` }).from(templates),
    db
      .select({
        day: sql<string>`date(${notifications.createdAt} at time zone 'UTC')`,
        status: notifications.status,
        count: sql<number>`count(*)::int`,
      })
      .from(notifications)
      .where(gte(notifications.createdAt, sevenDaysAgo))
      .groupBy(sql`date(${notifications.createdAt} at time zone 'UTC')`, notifications.status),
    db
      .select({
        day: sql<string>`date(${scheduledNotifications.sentAt} at time zone 'UTC')`,
        count: sql<number>`count(*)::int`,
      })
      .from(scheduledNotifications)
      .where(
        and(
          eq(scheduledNotifications.status, "sent"),
          isNotNull(scheduledNotifications.sentAt),
          gte(scheduledNotifications.sentAt, sevenDaysAgo)
        )
      )
      .groupBy(sql`date(${scheduledNotifications.sentAt} at time zone 'UTC')`),
  ]);

  const notificationsByStatus: Record<string, number> = {};
  notifByStatusRows.forEach((r) => {
    notificationsByStatus[r.status] = r.count;
  });

  const scheduledByStatus: Record<string, number> = {};
  scheduledByStatusRows.forEach((r) => {
    scheduledByStatus[r.status] = r.count;
  });

  const byDay: Record<string, { sent: number; failed: number }> = {};
  timeSeriesRaw.forEach((r) => {
    const dayKey = typeof r.day === "string" ? r.day.slice(0, 10) : new Date(r.day).toISOString().slice(0, 10);
    if (!byDay[dayKey]) byDay[dayKey] = { sent: 0, failed: 0 };
    if (r.status === "sent") byDay[dayKey].sent = r.count;
    if (r.status === "failed") byDay[dayKey].failed = r.count;
  });
  scheduledSentByDayRows.forEach((r) => {
    const dayKey = typeof r.day === "string" ? r.day.slice(0, 10) : new Date(r.day).toISOString().slice(0, 10);
    if (!byDay[dayKey]) byDay[dayKey] = { sent: 0, failed: 0 };
    byDay[dayKey].sent += r.count;
  });

  const days: { day: string; sent: number; failed: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    days.push({
      day: dayStr,
      sent: byDay[dayStr]?.sent ?? 0,
      failed: byDay[dayStr]?.failed ?? 0,
    });
  }

  return NextResponse.json({
    notificationsByStatus: {
      sent: notificationsByStatus.sent ?? 0,
      failed: notificationsByStatus.failed ?? 0,
      awaiting_approval: notificationsByStatus.awaiting_approval ?? 0,
      rejected: notificationsByStatus.rejected ?? 0,
    },
    scheduledByStatus: {
      pending: scheduledByStatus.pending ?? 0,
      awaiting_approval: scheduledByStatus.awaiting_approval ?? 0,
      sent: scheduledByStatus.sent ?? 0,
      cancelled: scheduledByStatus.cancelled ?? 0,
      rejected: scheduledByStatus.rejected ?? 0,
    },
    overTime: days,
    totals: {
      recipients: totalRecipients[0]?.count ?? 0,
      audiences: totalAudiences[0]?.count ?? 0,
      templates: totalTemplates[0]?.count ?? 0,
    },
  });
}
