import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { processScheduledNotifications } from "@/lib/notifications/process-scheduled";

/**
 * Process due scheduled notifications (status = pending, scheduledAt <= now).
 * Requires authentication. Used by the Scheduled page "Process due now" and on page load.
 * For unattended sending at due time, use an external cron that calls GET /api/cron/process-scheduled
 * every minute (see vercel.json and CRON_SECRET).
 */
export async function GET(_request: NextRequest) {
  const user = await getAuthUser(_request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await processScheduledNotifications();
    return NextResponse.json({ ok: true, message: "Processed due scheduled notifications." });
  } catch (err) {
    console.error("[process-scheduled]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Processing failed" },
      { status: 500 }
    );
  }
}
