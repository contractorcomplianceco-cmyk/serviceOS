import type {
  WorkOrder,
  Quote,
  Invoice,
  Payment,
  DocumentRecord,
  Equipment,
} from "@workspace/db";

// ---------------------------------------------------------------------------
// Portal serializers — STRICT per-customer redaction. These intentionally drop
// every internal-only field: costs, labor rates, internal notes, GPS
// coordinates, staff identities, and cross-customer data. Never widen these
// shapes to pass through raw rows — always allow-list fields explicitly.
// ---------------------------------------------------------------------------

const iso = (d: Date | null | undefined): string | null =>
  d ? d.toISOString() : null;

/** Redacted work order for the customer portal. */
export function toPortalWorkOrder(w: WorkOrder) {
  return {
    id: w.id,
    number: w.number,
    status: w.status,
    priority: w.priority,
    type: w.type,
    locationId: w.locationId,
    dueDate: w.dueDate,
    description: w.description,
    timeWindow: w.timeWindow ?? null,
    scheduledStart: iso(w.scheduledStart),
    scheduledEnd: iso(w.scheduledEnd),
    source: w.source,
    // Visits: only date + work-performed summary. No GPS, no costs, no tech id.
    visits: w.trips.map((t) => ({
      date: t.date,
      summary: t.workPerformed ?? null,
      technicianName: null,
    })),
    // Updates: derived from status history only — customer-safe milestones.
    updates: w.statusHistory.map((h) => ({
      timestamp: h.at,
      message: `Status: ${h.status}`,
    })),
    createdAt: w.createdAt.toISOString(),
  };
}

/** Redacted quote for the customer portal (line descriptions/qty/rate only). */
export function toPortalQuote(q: Quote) {
  return {
    id: q.id,
    number: q.number,
    title: q.title,
    amount: q.amount,
    status: q.status,
    validUntil: q.validUntil ?? null,
    notes: q.notes ?? null,
    lines: q.lines,
    decidedAt: iso(q.decidedAt),
    createdAt: q.createdAt.toISOString(),
  };
}

/** Redacted invoice for the customer portal. */
export function toPortalInvoice(i: Invoice) {
  return {
    id: i.id,
    number: i.number,
    workOrderId: i.workOrderId ?? null,
    amount: i.amount,
    amountPaid: i.amountPaid,
    status: i.status,
    issueDate: i.issueDate ?? null,
    dueDate: i.dueDate,
    paidDate: i.paidDate ?? null,
    lines: i.lines,
    createdAt: i.createdAt.toISOString(),
  };
}

/** Redacted payment for the customer portal (no internal recorder identity). */
export function toPortalPayment(p: Payment) {
  return {
    id: p.id,
    invoiceId: p.invoiceId,
    date: p.date,
    amount: p.amount,
    method: p.method,
    type: p.type,
  };
}

/** Redacted document for the customer portal. */
export function toPortalDocument(d: DocumentRecord) {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    expiration: d.expiration ?? null,
  };
}

/** Redacted equipment for the customer portal (no service/parts cost history). */
export function toPortalEquipment(e: Equipment) {
  return {
    id: e.id,
    assetName: e.assetName,
    model: e.model,
    serialNumber: e.serialNumber,
    locationId: e.locationId ?? null,
    lastServiced: e.lastServiced ?? null,
    warrantyInfo: e.warrantyInfo,
  };
}
