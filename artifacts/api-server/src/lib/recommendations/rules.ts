import { eq } from "drizzle-orm";
import {
  db,
  workOrdersTable,
  usersTable,
  inventoryTable,
  documentsTable,
  invoicesTable,
  customersTable,
  recommendationsTable,
  type Recommendation,
  type RecommendationEvidence,
} from "@workspace/db";

// A candidate is the pure output of a rule firing against live data. The
// generator reconciles candidates against stored recommendations by dedupeKey.
interface Candidate {
  dedupeKey: string;
  ruleKey: string;
  type: string;
  severity: "info" | "warning" | "urgent";
  title: string;
  description: string;
  reason: string;
  evidence: RecommendationEvidence[];
  confidence: number;
  suggestedAction: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

const truncate = (t: string, max = 60): string =>
  t.length > max ? `${t.slice(0, max - 1)}…` : t;

const money = (n: number): string =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

// Derive a customer document status from its expiration date (documents store a
// raw expiration, not a computed status).
function docStatus(expiration: string | null): "Valid" | "Expiring Soon" | "Expired" | "Unknown" {
  if (!expiration) return "Unknown";
  const exp = new Date(`${expiration}T00:00:00.000Z`).getTime();
  if (Number.isNaN(exp)) return "Unknown";
  const now = Date.now();
  if (exp < now) return "Expired";
  if (exp - now < 30 * 86_400_000) return "Expiring Soon";
  return "Valid";
}

// Pure rules engine: derives all candidate recommendations from live tenant
// data. Every candidate carries concrete evidence and a reason string so the
// UI can explain *why* RoseOS is surfacing it — no hardcoded seed text.
async function computeCandidates(tenantId: string): Promise<Candidate[]> {
  const [workOrders, users, inventory, documents, invoices, customers] =
    await Promise.all([
      db.select().from(workOrdersTable).where(eq(workOrdersTable.tenantId, tenantId)),
      db.select().from(usersTable).where(eq(usersTable.tenantId, tenantId)),
      db.select().from(inventoryTable).where(eq(inventoryTable.tenantId, tenantId)),
      db.select().from(documentsTable).where(eq(documentsTable.tenantId, tenantId)),
      db.select().from(invoicesTable).where(eq(invoicesTable.tenantId, tenantId)),
      db.select().from(customersTable).where(eq(customersTable.tenantId, tenantId)),
    ]);

  const custName = (id: string | null) =>
    customers.find((c) => c.id === id)?.name ?? "customer";
  const candidates: Candidate[] = [];

  // 1) Unassigned Emergency / High priority work orders → Scheduling.
  for (const w of workOrders) {
    if (
      !w.assignedTechnicianId &&
      (w.priority === "Emergency" || w.priority === "High") &&
      w.status !== "Closed" &&
      w.status !== "Cancelled"
    ) {
      const urgent = w.priority === "Emergency";
      candidates.push({
        dedupeKey: `emergency:${w.id}`,
        ruleKey: "unassigned-priority-work-order",
        type: "Scheduling",
        severity: urgent ? "urgent" : "warning",
        title: `${w.priority} job needs scheduling`,
        description: `${w.number} (${truncate(w.description)}) for ${custName(w.customerId)} is unassigned.`,
        reason: `Work order priority is ${w.priority} and no technician is assigned while the job is still ${w.status}.`,
        evidence: [
          { label: "Work Order", value: w.number },
          { label: "Priority", value: w.priority },
          { label: "Status", value: w.status },
          { label: "Assigned", value: "None" },
        ],
        confidence: urgent ? 96 : 88,
        suggestedAction: "Assign a technician",
        relatedEntityType: "WorkOrder",
        relatedEntityId: w.id,
      });
    }
  }

  // 2) Technicians booked over capacity → Overload.
  for (const u of users) {
    const load = u.workloadHours ?? 0;
    const cap = u.capacityHours ?? 0;
    if (u.active && cap > 0 && load > cap) {
      candidates.push({
        dedupeKey: `overload:${u.id}`,
        ruleKey: "technician-overload",
        type: "Overload",
        severity: "warning",
        title: "Technician overload warning",
        description: `${u.name} is booked ${load} hrs against a ${cap} hr capacity.`,
        reason: `Scheduled workload (${load}h) exceeds daily capacity (${cap}h) by ${(load - cap).toFixed(1)}h.`,
        evidence: [
          { label: "Technician", value: u.name },
          { label: "Workload", value: `${load}h` },
          { label: "Capacity", value: `${cap}h` },
        ],
        confidence: 88,
        suggestedAction: "Rebalance a job to another technician",
        relatedEntityType: "User",
        relatedEntityId: u.id,
      });
    }
  }

  // 3) Inventory at/below reorder point → Inventory.
  for (const it of inventory) {
    if (it.quantity <= it.reorderPoint) {
      candidates.push({
        dedupeKey: `inventory:${it.id}`,
        ruleKey: "inventory-below-reorder",
        type: "Inventory",
        severity: it.quantity === 0 ? "urgent" : "warning",
        title: "Inventory below reorder point",
        description: `${it.name} is low (${it.quantity} on hand, reorder at ${it.reorderPoint}).`,
        reason: `On-hand quantity (${it.quantity}) is at or below the reorder point (${it.reorderPoint}).`,
        evidence: [
          { label: "Item", value: it.name },
          { label: "On hand", value: String(it.quantity) },
          { label: "Reorder point", value: String(it.reorderPoint) },
          { label: "Location", value: it.location },
        ],
        confidence: 97,
        suggestedAction: "Create a purchase request",
        relatedEntityType: "Inventory",
        relatedEntityId: it.id,
      });
    }
  }

  // 4) Customer documents Expired / Expiring Soon → Document.
  for (const d of documents) {
    const status = docStatus(d.expiration);
    if (status === "Expired" || status === "Expiring Soon") {
      const expired = status === "Expired";
      candidates.push({
        dedupeKey: `document:${d.id}`,
        ruleKey: "compliance-document-expiring",
        type: "Document",
        severity: expired ? "urgent" : "warning",
        title: expired ? "Customer document expired" : "Customer document expiring soon",
        description: `${custName(d.customerId)} ${d.type} (${d.name}) is ${status.toLowerCase()}.`,
        reason: `Document expiration ${d.expiration ?? "unknown"} makes it ${status.toLowerCase()}; jobs at this customer may be non-compliant.`,
        evidence: [
          { label: "Customer", value: custName(d.customerId) },
          { label: "Document", value: `${d.type} — ${d.name}` },
          { label: "Expiration", value: d.expiration ?? "unknown" },
          { label: "Status", value: status },
        ],
        confidence: 100,
        suggestedAction: "Request an updated document",
        relatedEntityType: "Customer",
        relatedEntityId: d.customerId ?? undefined,
      });
    }
  }

  // 5) Invoices past due → AR.
  for (const i of invoices) {
    if (i.status === "Past Due") {
      const outstanding = i.amount - (i.amountPaid ?? 0);
      candidates.push({
        dedupeKey: `ar:${i.id}`,
        ruleKey: "invoice-past-due",
        type: "AR",
        severity: outstanding > 5000 ? "urgent" : "warning",
        title: "AR risk — invoice past due",
        description: `${i.number} for ${custName(i.customerId)} is past due (${money(outstanding)} outstanding).`,
        reason: `Invoice is marked Past Due with ${money(outstanding)} still outstanding.`,
        evidence: [
          { label: "Invoice", value: i.number },
          { label: "Customer", value: custName(i.customerId) },
          { label: "Outstanding", value: money(outstanding) },
          { label: "Due date", value: i.dueDate ?? "—" },
        ],
        confidence: 100,
        suggestedAction: "Start a collections follow-up",
        relatedEntityType: "Invoice",
        relatedEntityId: i.id,
      });
    }
  }

  // 6) Work orders ready for billing → Billing.
  for (const w of workOrders) {
    if (w.status === "Ready for Billing") {
      candidates.push({
        dedupeKey: `billing:${w.id}`,
        ruleKey: "work-order-ready-for-billing",
        type: "Billing",
        severity: "info",
        title: "Job ready for billing review",
        description: `${w.number} (${custName(w.customerId)}) is ready for invoicing.`,
        reason: `Work order status is "Ready for Billing" — approved labor and materials are complete.`,
        evidence: [
          { label: "Work Order", value: w.number },
          { label: "Customer", value: custName(w.customerId) },
          { label: "Status", value: w.status },
        ],
        confidence: 100,
        suggestedAction: "Review and generate an invoice",
        relatedEntityType: "WorkOrder",
        relatedEntityId: w.id,
      });
    }
  }

  // 7) Scheduled work orders with no trips logged → Missing Info.
  for (const w of workOrders) {
    const trips = Array.isArray(w.trips) ? w.trips : [];
    if ((w.status === "Scheduled" || w.status === "First Trip") && trips.length === 0) {
      candidates.push({
        dedupeKey: `missing:${w.id}`,
        ruleKey: "scheduled-without-trip",
        type: "Missing Info",
        severity: "info",
        title: "Job missing technician update",
        description: `${w.number} (${custName(w.customerId)}) is scheduled but has no trip logged.`,
        reason: `Work order is ${w.status} but has zero trips/check-ins recorded from the assigned technician.`,
        evidence: [
          { label: "Work Order", value: w.number },
          { label: "Status", value: w.status },
          { label: "Trips", value: "0" },
        ],
        confidence: 82,
        suggestedAction: "Nudge the assigned technician for a check-in",
        relatedEntityType: "WorkOrder",
        relatedEntityId: w.id,
      });
    }
  }

  // 8) Work orders awaiting materials → Material.
  for (const w of workOrders) {
    if (w.status === "Awaiting Materials") {
      candidates.push({
        dedupeKey: `material:${w.id}`,
        ruleKey: "work-order-awaiting-materials",
        type: "Material",
        severity: "warning",
        title: "Job blocked awaiting materials",
        description: `${w.number} (${custName(w.customerId)}) is waiting on materials.`,
        reason: `Work order status is "Awaiting Materials" — the job cannot progress until parts arrive.`,
        evidence: [
          { label: "Work Order", value: w.number },
          { label: "Customer", value: custName(w.customerId) },
          { label: "Status", value: w.status },
        ],
        confidence: 90,
        suggestedAction: "Confirm the material order and ETA",
        relatedEntityType: "WorkOrder",
        relatedEntityId: w.id,
      });
    }
  }

  return candidates;
}

export interface GenerateResult {
  created: number;
  updated: number;
  resolved: number;
  reopened: number;
}

// Reconcile candidates against stored recommendations for a tenant. Lifecycle
// states set by humans (Approved/Edited/Rejected/Resolved) are preserved;
// Open/Snoozed recommendations are refreshed. Open recommendations whose
// condition no longer fires are auto-resolved so they disappear from the queue.
export async function generateRecommendations(
  tenantId: string,
): Promise<GenerateResult> {
  const candidates = await computeCandidates(tenantId);
  const existing = await db
    .select()
    .from(recommendationsTable)
    .where(eq(recommendationsTable.tenantId, tenantId));
  const byKey = new Map<string, Recommendation>(
    existing.map((r) => [r.dedupeKey, r]),
  );
  const now = new Date();
  const result: GenerateResult = { created: 0, updated: 0, resolved: 0, reopened: 0 };
  const seenKeys = new Set<string>();

  for (const c of candidates) {
    seenKeys.add(c.dedupeKey);
    const prev = byKey.get(c.dedupeKey);
    if (!prev) {
      await db.insert(recommendationsTable).values({
        tenantId,
        dedupeKey: c.dedupeKey,
        ruleKey: c.ruleKey,
        type: c.type,
        severity: c.severity,
        title: c.title,
        description: c.description,
        reason: c.reason,
        evidence: c.evidence,
        confidence: c.confidence,
        suggestedAction: c.suggestedAction,
        relatedEntityType: c.relatedEntityType ?? null,
        relatedEntityId: c.relatedEntityId ?? null,
        status: "Open",
        lastGeneratedAt: now,
        lifecycle: [
          { at: now.toISOString(), actorId: "system", actor: "RoseOS", action: "generated", detail: `Rule ${c.ruleKey} fired` },
        ],
      });
      result.created++;
      continue;
    }

    // A snoozed recommendation whose snooze window elapsed re-opens.
    const snoozeElapsed =
      prev.status === "Snoozed" && prev.snoozeUntil !== null && prev.snoozeUntil <= now;

    if (prev.status === "Open" || snoozeElapsed) {
      await db
        .update(recommendationsTable)
        .set({
          type: c.type,
          severity: c.severity,
          title: c.title,
          description: c.description,
          reason: c.reason,
          evidence: c.evidence,
          confidence: c.confidence,
          suggestedAction: c.suggestedAction,
          status: "Open",
          snoozeUntil: null,
          lastGeneratedAt: now,
          ...(snoozeElapsed
            ? {
                lifecycle: [
                  ...prev.lifecycle,
                  { at: now.toISOString(), actorId: "system", actor: "RoseOS", action: "reopened", detail: "Snooze window elapsed; condition still active" },
                ],
              }
            : {}),
        })
        .where(eq(recommendationsTable.id, prev.id));
      if (snoozeElapsed) result.reopened++;
      else result.updated++;
    } else {
      // Approved/Edited/Rejected/Resolved: keep lifecycle state, just refresh
      // the generation timestamp so it isn't auto-resolved as stale.
      await db
        .update(recommendationsTable)
        .set({ lastGeneratedAt: now })
        .where(eq(recommendationsTable.id, prev.id));
    }
  }

  // Auto-resolve Open recommendations whose condition no longer fires.
  const staleOpen = existing.filter(
    (r) => r.status === "Open" && !seenKeys.has(r.dedupeKey),
  );
  if (staleOpen.length > 0) {
    for (const r of staleOpen) {
      await db
        .update(recommendationsTable)
        .set({
          status: "Resolved",
          resolvedAt: now,
          lifecycle: [
            ...r.lifecycle,
            { at: now.toISOString(), actorId: "system", actor: "RoseOS", action: "auto-resolved", detail: "Underlying condition cleared" },
          ],
        })
        .where(eq(recommendationsTable.id, r.id));
    }
    result.resolved = staleOpen.length;
  }

  return result;
}
