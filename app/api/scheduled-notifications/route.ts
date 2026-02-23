import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scheduledNotifications, templates } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/api-auth";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { inArray } from "drizzle-orm";

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
  if (status) conditions.push(eq(scheduledNotifications.status, status));
  if (messageType === "sms" || messageType === "whatsapp") conditions.push(eq(scheduledNotifications.messageType, messageType));
  if (fromDate) {
    const from = new Date(fromDate);
    if (!Number.isNaN(from.getTime())) conditions.push(gte(scheduledNotifications.scheduledAt, from));
  }
  if (toDate) {
    const to = new Date(toDate);
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      conditions.push(lte(scheduledNotifications.scheduledAt, to));
    }
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const offset = (page - 1) * LIMIT;
  const [list, countRows] = await Promise.all([
    db
      .select()
      .from(scheduledNotifications)
      .where(where)
      .orderBy(desc(scheduledNotifications.scheduledAt))
      .limit(LIMIT)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(scheduledNotifications).where(where),
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
    scheduledNotifications: items,
    total,
    page,
    limit: LIMIT,
    totalPages: Math.ceil(total / LIMIT) || 1,
  });
}
