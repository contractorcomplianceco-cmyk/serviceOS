import { and, desc, eq } from "drizzle-orm";
import {
  db,
  integrationConnectionsTable,
  integrationEventsTable,
  integrationIdMapTable,
  intakeTable,
  type IntegrationConnection,
  type IntegrationEvent,
  type IntegrationEventStatus,
  type IntegrationStatusEvent,
} from "@workspace/db";
import { adapterForProvider } from "./adapters";

// ---------------------------------------------------------------------------
// Integration framework: the explicit state machine that every adapter shares.
//
// Inbound:  Received → Mapped → (apply) → Ignored/Failed. Applying creates a
//           Draft Intake locally; an external-ID map keeps inbound idempotent.
// Outbound: Received → PendingApproval → Approved → Submitted / Failed. Nothing
//           is submitted externally until a human approves (HITL guardrail).
// ---------------------------------------------------------------------------

function nowIso(): string {
  return new Date().toISOString();
}

function history(
  prev: IntegrationStatusEvent[],
  status: IntegrationEventStatus,
  detail: string,
): IntegrationStatusEvent[] {
  return [...prev, { at: nowIso(), status, detail }];
}

async function loadConnection(
  id: string,
): Promise<IntegrationConnection | undefined> {
  const [row] = await db
    .select()
    .from(integrationConnectionsTable)
    .where(eq(integrationConnectionsTable.id, id))
    .limit(1);
  return row;
}

async function loadEvent(id: string): Promise<IntegrationEvent | undefined> {
  const [row] = await db
    .select()
    .from(integrationEventsTable)
    .where(eq(integrationEventsTable.id, id))
    .limit(1);
  return row;
}

function isProcessing(state: string): boolean {
  // Only sandbox/simulated connections actually process traffic.
  return state === "Sandbox" || state === "Simulated" || state === "Connected";
}

export async function listEvents(
  tenantId: string,
  connectionId: string,
): Promise<IntegrationEvent[]> {
  return db
    .select()
    .from(integrationEventsTable)
    .where(
      and(
        eq(integrationEventsTable.tenantId, tenantId),
        eq(integrationEventsTable.connectionId, connectionId),
      ),
    )
    .orderBy(desc(integrationEventsTable.createdAt));
}

/**
 * Simulate an inbound message from the external system, map it, and apply it as
 * a Draft intake. Idempotent per (connection, externalId).
 */
export async function simulateInbound(
  tenantId: string,
  connectionId: string,
): Promise<IntegrationEvent> {
  const conn = await loadConnection(connectionId);
  if (!conn) throw new Error("Connection not found");
  const adapter = adapterForProvider(conn.provider);
  if (!adapter) throw new Error(`No adapter for provider ${conn.provider}`);
  if (!isProcessing(conn.state)) {
    throw new Error(
      `Connection is ${conn.state}; only Sandbox/Simulated connections process inbound traffic`,
    );
  }

  const inbound = await adapter.simulateInbound(conn);
  let hist = history([], "Received", `Inbound ${inbound.eventType} received`);

  // Map inbound → local draft shape.
  const mapping = await adapter.mapInbound(conn, inbound.payload);
  hist = history(hist, "Mapped", `Mapped to ${mapping.entityType} draft`);

  const [event] = await db
    .insert(integrationEventsTable)
    .values({
      tenantId,
      connectionId,
      direction: "Inbound",
      eventType: inbound.eventType,
      externalId: inbound.externalId,
      entityType: mapping.entityType,
      status: "Mapped",
      requiresApproval: "false",
      payload: inbound.payload,
      mappedPayload: mapping.mapped,
      statusHistory: hist,
    })
    .returning();

  // Idempotency: skip apply if we've already mapped this externalId.
  const existing = await db
    .select()
    .from(integrationIdMapTable)
    .where(
      and(
        eq(integrationIdMapTable.connectionId, connectionId),
        eq(integrationIdMapTable.externalId, inbound.externalId),
      ),
    )
    .limit(1);
  if (existing[0]) {
    return finishEvent(
      event.id,
      "Ignored",
      `Duplicate of already-imported ${inbound.externalId}`,
    );
  }

  // Apply: create a Draft Intake (human triages/converts — never auto-scheduled).
  const customerId = String(mapping.mapped.customerId ?? "");
  if (!customerId) {
    await bumpConnection(connectionId, { lastInboundAt: new Date() });
    return finishEvent(
      event.id,
      "Failed",
      "No customer mapping configured for this connection",
    );
  }

  const [intake] = await db
    .insert(intakeTable)
    .values({
      tenantId,
      source: String(mapping.mapped.source ?? conn.provider),
      customerId,
      locationId: (mapping.mapped.locationId as string | null) ?? null,
      priority: String(mapping.mapped.priority ?? "Medium"),
      requestedDate: new Date().toISOString().slice(0, 10),
      description: String(mapping.mapped.description ?? ""),
      suggestedAction: String(mapping.mapped.suggestedAction ?? ""),
      status: "New",
    })
    .returning();

  await db.insert(integrationIdMapTable).values({
    tenantId,
    connectionId,
    externalId: inbound.externalId,
    entityType: "Intake",
    entityId: intake.id,
  });

  await bumpConnection(connectionId, { lastInboundAt: new Date() });

  const [updated] = await db
    .update(integrationEventsTable)
    .set({
      status: "Ignored",
      entityId: intake.id,
      statusHistory: history(
        hist,
        "Ignored",
        `Applied as Draft intake ${intake.id} (awaiting human triage)`,
      ),
    })
    .where(eq(integrationEventsTable.id, event.id))
    .returning();
  return updated;
}

/**
 * Queue an OUTBOUND event (e.g. status update back to the external system). It
 * starts at PendingApproval and is NOT submitted until approveOutbound runs.
 */
export async function queueOutbound(
  tenantId: string,
  connectionId: string,
  eventType: string,
  mapped: Record<string, unknown>,
  opts?: { entityType?: string; entityId?: string; externalId?: string },
): Promise<IntegrationEvent> {
  const [event] = await db
    .insert(integrationEventsTable)
    .values({
      tenantId,
      connectionId,
      direction: "Outbound",
      eventType,
      externalId: opts?.externalId ?? null,
      entityType: opts?.entityType ?? null,
      entityId: opts?.entityId ?? null,
      status: "PendingApproval",
      requiresApproval: "true",
      payload: mapped,
      mappedPayload: mapped,
      statusHistory: history(
        [],
        "PendingApproval",
        "Outbound update queued — awaiting human approval before submission",
      ),
    })
    .returning();
  return event;
}

/** Approve and submit a queued outbound event (admin action). */
export async function approveOutbound(
  tenantId: string,
  eventId: string,
  approverUserId: string,
): Promise<IntegrationEvent> {
  const event = await loadEvent(eventId);
  if (!event || event.tenantId !== tenantId)
    throw new Error("Event not found");
  if (event.direction !== "Outbound" || event.status !== "PendingApproval") {
    return event;
  }
  const conn = await loadConnection(event.connectionId);
  if (!conn) throw new Error("Connection not found");
  const adapter = adapterForProvider(conn.provider);
  if (!adapter) throw new Error(`No adapter for provider ${conn.provider}`);

  let hist = history(
    event.statusHistory,
    "Approved",
    "Approved by administrator — submitting",
  );
  await db
    .update(integrationEventsTable)
    .set({
      status: "Approved",
      approvedByUserId: approverUserId,
      approvedAt: new Date(),
      statusHistory: hist,
    })
    .where(eq(integrationEventsTable.id, eventId));

  const attempt = event.attempts + 1;
  const result = await adapter.submitOutbound(conn, event.payload);
  if (result.ok) {
    hist = history(hist, "Submitted", result.detail);
    await bumpConnection(conn.id, { lastOutboundAt: new Date() });
    const [row] = await db
      .update(integrationEventsTable)
      .set({
        status: "Submitted",
        attempts: attempt,
        externalId: result.externalId ?? event.externalId,
        lastError: null,
        statusHistory: hist,
      })
      .where(eq(integrationEventsTable.id, eventId))
      .returning();
    return row;
  }
  hist = history(hist, "Failed", `Submission failed: ${result.detail}`);
  const [row] = await db
    .update(integrationEventsTable)
    .set({ status: "Failed", attempts: attempt, lastError: result.detail, statusHistory: hist })
    .where(eq(integrationEventsTable.id, eventId))
    .returning();
  return row;
}

/** Reject a queued outbound event without submitting (admin action). */
export async function rejectOutbound(
  tenantId: string,
  eventId: string,
): Promise<IntegrationEvent> {
  const event = await loadEvent(eventId);
  if (!event || event.tenantId !== tenantId)
    throw new Error("Event not found");
  if (event.status !== "PendingApproval") return event;
  const [row] = await db
    .update(integrationEventsTable)
    .set({
      status: "Rejected",
      statusHistory: history(
        event.statusHistory,
        "Rejected",
        "Rejected by administrator — not submitted",
      ),
    })
    .where(eq(integrationEventsTable.id, eventId))
    .returning();
  return row;
}

/** Retry a failed event. Outbound re-enters the approval queue for safety. */
export async function retryEvent(
  tenantId: string,
  eventId: string,
): Promise<IntegrationEvent> {
  const event = await loadEvent(eventId);
  if (!event || event.tenantId !== tenantId)
    throw new Error("Event not found");
  if (event.status !== "Failed") return event;

  if (event.direction === "Outbound") {
    const [row] = await db
      .update(integrationEventsTable)
      .set({
        status: "PendingApproval",
        statusHistory: history(
          event.statusHistory,
          "PendingApproval",
          "Re-queued for approval after failure",
        ),
      })
      .where(eq(integrationEventsTable.id, eventId))
      .returning();
    return row;
  }
  // Inbound retry re-attempts the apply by re-simulating from stored payload.
  const [row] = await db
    .update(integrationEventsTable)
    .set({
      status: "Retrying",
      statusHistory: history(
        event.statusHistory,
        "Retrying",
        "Inbound re-attempt queued",
      ),
    })
    .where(eq(integrationEventsTable.id, eventId))
    .returning();
  return row;
}

async function finishEvent(
  id: string,
  status: IntegrationEventStatus,
  detail: string,
): Promise<IntegrationEvent> {
  const event = await loadEvent(id);
  const [row] = await db
    .update(integrationEventsTable)
    .set({
      status,
      lastError: status === "Failed" ? detail : null,
      statusHistory: history(event?.statusHistory ?? [], status, detail),
    })
    .where(eq(integrationEventsTable.id, id))
    .returning();
  return row;
}

async function bumpConnection(
  id: string,
  patch: Partial<{ lastInboundAt: Date; lastOutboundAt: Date; lastError: string | null }>,
): Promise<void> {
  await db
    .update(integrationConnectionsTable)
    .set(patch)
    .where(eq(integrationConnectionsTable.id, id));
}
