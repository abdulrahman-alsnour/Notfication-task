import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications, scheduledNotifications } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/api-auth";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [notifRow, schedRow] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(eq(notifications.status, "awaiting_approval")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(scheduledNotifications)
      .where(eq(scheduledNotifications.status, "awaiting_approval")),
  ]);

  const count = (notifRow[0]?.count ?? 0) + (schedRow[0]?.count ?? 0);
  return NextResponse.json({ count });
}
