import {
  AIRecommendation, WorkOrder, User, InventoryItem, CustomerDocument,
  Invoice, Customer,
} from './types';

// A minimal slice of the store used to derive live recommendations.
export interface RecommendationSource {
  workOrders: WorkOrder[];
  users: User[];
  inventory: InventoryItem[];
  documents: CustomerDocument[];
  invoices: Invoice[];
  customers: Customer[];
  dismissedRecIds: string[];
}

const truncate = (text: string, max = 60): string =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

// Derives AIRecommendation[] from live application state. Every recommendation
// carries a STABLE id derived from its source entity so it disappears when the
// underlying condition is resolved (or the user dismisses it).
export function computeRecommendations(store: RecommendationSource): AIRecommendation[] {
  const { workOrders, users, inventory, documents, invoices, customers, dismissedRecIds } = store;
  const recs: AIRecommendation[] = [];

  const custName = (id: string) => customers.find((c) => c.id === id)?.name ?? 'customer';

  // 1) Unassigned Emergency / High priority work orders → Scheduling (urgent).
  workOrders
    .filter((w) => !w.assignedTechnicianId && (w.priority === 'Emergency' || w.priority === 'High') && w.status !== 'Closed' && w.status !== 'Cancelled')
    .forEach((w) => {
      const urgent = w.priority === 'Emergency';
      recs.push({
        id: `rec-emergency-${w.id}`,
        type: 'Scheduling',
        severity: urgent ? 'urgent' : 'warning',
        title: `${w.priority} job needs scheduling`,
        description: `${w.number} (${truncate(w.description)}) for ${custName(w.customerId)} is unassigned. RoseOS suggests dispatching a technician now.`,
        confidence: urgent ? 96 : 88,
        primaryAction: 'Assign',
        relatedEntityId: w.id,
        needsApproval: true,
      });
    });

  // 2) Technicians booked over capacity → Overload (warning).
  users
    .filter((u) => u.active && (u.workloadHours ?? 0) > (u.capacityHours ?? 0) && (u.capacityHours ?? 0) > 0)
    .forEach((u) => {
      recs.push({
        id: `rec-overload-${u.id}`,
        type: 'Overload',
        severity: 'warning',
        title: 'Technician overload warning',
        description: `${u.name} is booked ${u.workloadHours} hrs against a ${u.capacityHours} hr capacity today. Consider rebalancing a job.`,
        confidence: 88,
        primaryAction: 'Rebalance',
        relatedEntityId: u.id,
        needsApproval: true,
      });
    });

  // 3) Inventory at/below reorder point → Inventory (warning).
  inventory
    .filter((it) => it.quantity <= it.reorderPoint)
    .forEach((it) => {
      recs.push({
        id: `rec-inventory-${it.id}`,
        type: 'Inventory',
        severity: 'warning',
        title: 'Inventory below reorder point',
        description: `${it.name} is low (${it.quantity} left, reorder at ${it.reorderPoint}). RoseOS suggests a reorder.`,
        confidence: 97,
        primaryAction: 'Reorder',
        relatedEntityId: it.id,
        needsApproval: true,
      });
    });

  // 4) Customer documents Expired / Expiring Soon → Document.
  documents
    .filter((d) => d.status === 'Expired' || d.status === 'Expiring Soon')
    .forEach((d) => {
      const expired = d.status === 'Expired';
      recs.push({
        id: `rec-document-${d.id}`,
        type: 'Document',
        severity: expired ? 'urgent' : 'warning',
        title: expired ? 'Customer document expired' : 'Customer document expiring soon',
        description: `${custName(d.customerId)} ${d.type} (${d.name}) is ${d.status.toLowerCase()}. Jobs at this customer may be non-compliant.`,
        confidence: 100,
        primaryAction: 'Request',
        relatedEntityId: d.customerId,
        needsApproval: false,
      });
    });

  // 5) Invoices past due → AR (warning).
  invoices
    .filter((i) => i.status === 'Past Due')
    .forEach((i) => {
      recs.push({
        id: `rec-ar-${i.id}`,
        type: 'AR',
        severity: 'warning',
        title: 'AR risk — invoice past due',
        description: `${i.number} for ${custName(i.customerId)} is past due (${(i.amount - (i.amountPaid ?? 0)).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} outstanding). RoseOS suggests a collections follow-up.`,
        confidence: 100,
        primaryAction: 'Review',
        relatedEntityId: i.id,
        needsApproval: false,
      });
    });

  // 6) Work orders ready for billing → Billing.
  workOrders
    .filter((w) => w.status === 'Ready for Billing')
    .forEach((w) => {
      recs.push({
        id: `rec-billing-${w.id}`,
        type: 'Billing',
        severity: 'info',
        title: 'Job ready for billing review',
        description: `${w.number} (${custName(w.customerId)}) has approved labor + materials and is ready for invoicing.`,
        confidence: 100,
        primaryAction: 'Review',
        relatedEntityId: w.id,
        needsApproval: true,
      });
    });

  // 7) Scheduled work orders with no trips / check-in → Missing Info.
  workOrders
    .filter((w) => (w.status === 'Scheduled' || w.status === 'First Trip') && w.trips.length === 0)
    .forEach((w) => {
      recs.push({
        id: `rec-missing-${w.id}`,
        type: 'Missing Info',
        severity: 'info',
        title: 'Job missing technician update',
        description: `${w.number} (${custName(w.customerId)}) is scheduled but has no check-in or trip logged from the assigned tech.`,
        confidence: 82,
        primaryAction: 'Nudge',
        relatedEntityId: w.id,
        needsApproval: false,
      });
    });

  return recs.filter((r) => !dismissedRecIds.includes(r.id));
}
