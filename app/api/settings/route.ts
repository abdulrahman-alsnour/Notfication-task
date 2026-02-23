import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { getAuthUser, forbiddenResponse } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [settings] = await db.select().from(systemSettings).limit(1);
  if (!settings) {
    return NextResponse.json({
      settings: {
        scopeMappings: {},
        objectTypeIcons: {},
        approvalEnabled: false,
      },
    });
  }
  return NextResponse.json({
    settings: {
      scopeMappings: settings.scopeMappings,
      objectTypeIcons: settings.objectTypeIcons,
      approvalEnabled: settings.approvalEnabled,
    },
  });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return forbiddenResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const scopeMappings = b.scopeMappings && typeof b.scopeMappings === "object" ? b.scopeMappings : undefined;
  const objectTypeIcons = b.objectTypeIcons && typeof b.objectTypeIcons === "object" ? b.objectTypeIcons : undefined;
  const approvalEnabled = typeof b.approvalEnabled === "boolean" ? b.approvalEnabled : undefined;

  const [existing] = await db.select().from(systemSettings).limit(1);
  if (!existing) {
    await db.insert(systemSettings).values({
      scopeMappings: (scopeMappings as object) ?? {},
      objectTypeIcons: (objectTypeIcons as object) ?? {},
      approvalEnabled: approvalEnabled ?? false,
    });
  } else {
    await db
      .update(systemSettings)
      .set({
        ...(scopeMappings && { scopeMappings: scopeMappings as object }),
        ...(objectTypeIcons && { objectTypeIcons: objectTypeIcons as object }),
        ...(approvalEnabled !== undefined && { approvalEnabled }),
      })
      .where(eq(systemSettings.id, existing.id));
  }

  const [updated] = await db.select().from(systemSettings).limit(1);
  await logAudit(user.id, "update", "settings", null, { approvalEnabled });
  return NextResponse.json({
    settings: updated
      ? {
          scopeMappings: updated.scopeMappings,
          objectTypeIcons: updated.objectTypeIcons,
          approvalEnabled: updated.approvalEnabled,
        }
      : { scopeMappings: {}, objectTypeIcons: {}, approvalEnabled: false },
  });
}
