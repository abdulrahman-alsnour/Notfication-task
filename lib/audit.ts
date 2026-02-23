import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

export type AuditAction = "create" | "update" | "delete" | "send" | "approve" | "reject";
export type AuditEntityType =
  | "audience"
  | "template"
  | "notification"
  | "scheduled_notification"
  | "recipient"
  | "scope"
  | "user"
  | "settings";

export async function logAudit(
  userId: number | null,
  action: AuditAction,
  entityType: AuditEntityType,
  entityId?: string | number | null,
  details?: Record<string, unknown> | null
) {
  await db.insert(auditLog).values({
    userId: userId ?? null,
    action,
    entityType,
    entityId: entityId != null ? String(entityId) : null,
    details: details ?? null,
  });
}
