import type { Request } from "express";
import { db, auditLogTable } from "@workspace/db";

export interface AuditInput {
  tenantId: string;
  actorUserId?: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}

/** Append an immutable audit event. Never throws into the request path. */
export async function writeAudit(
  input: AuditInput,
  req?: Request,
): Promise<void> {
  try {
    await db.insert(auditLogTable).values({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      metadata: input.metadata ?? null,
      ip: input.ip ?? null,
    });
  } catch (err) {
    if (req) req.log.error({ err }, "Failed to write audit event");
  }
}
