import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User, Customer, Location, WorkOrder, Invoice, AIRecommendation,
  IntakeItem, InventoryItem, Equipment, CustomerDocument, Closeout,
  AuditEvent, Payment, PaymentType, LaborEntry, MaterialEntry, PortalSyncStatus,
  BillingStatus,
} from './types';
import * as initialData from './mock-data';
import { useAuth, mapAuthUserToUser, IS_DEV } from './auth';

interface AppState {
  currentUserId: string;
  users: User[];
  customers: Customer[];
  locations: Location[];
  workOrders: WorkOrder[];
  invoices: Invoice[];
  recommendations: AIRecommendation[];
  intake: IntakeItem[];
  inventory: InventoryItem[];
  equipment: Equipment[];
  documents: CustomerDocument[];
  closeouts: Closeout[];
  auditLog: AuditEvent[];
  dismissedRecIds: string[];
}

type AuditInput = Pick<AuditEvent, 'action' | 'entityType' | 'entityId' | 'summary'>;

interface AppContextType extends Omit<AppState, 'currentUserId'> {
  currentUser: User;
  setCurrentUserId: (id: string) => void;
  updateWorkOrder: (id: string, data: Partial<WorkOrder>) => void;
  addWorkOrder: (data: WorkOrder) => void;
  updateInvoice: (id: string, data: Partial<Invoice>) => void;
  addInvoice: (data: Invoice) => void;
  dismissRecommendation: (id: string) => void;
  dismissIntake: (id: string) => void;
  updateInventory: (id: string, data: Partial<InventoryItem>) => void;
  updateCloseout: (id: string, data: Partial<Closeout>) => void;
  resetData: () => void;
  // --- workflow actions added for the operational spine ---
  logAudit: (e: AuditInput) => void;
  convertIntakeToWorkOrder: (intakeId: string, overrides?: Partial<WorkOrder>) => string | null;
  addLaborEntry: (workOrderId: string, entry: Omit<LaborEntry, 'id'>) => void;
  addMaterialEntry: (workOrderId: string, entry: Omit<MaterialEntry, 'id'>) => void;
  addWorkOrderNote: (workOrderId: string, message: string) => void;
  technicianCheckIn: (workOrderId: string) => void;
  technicianCheckOut: (workOrderId: string, workPerformed?: string) => void;
  approveCloseout: (closeoutId: string) => void;
  sendBackCloseout: (closeoutId: string, reason?: string) => void;
  addCustomer: (data: Customer) => void;
  addLocation: (data: Location) => void;
  addEquipment: (data: Equipment) => void;
  recordPayment: (invoiceId: string, amount: number, type: PaymentType, method?: string) => void;
  sendPortalUpdate: (workOrderId: string, status: PortalSyncStatus) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'serviceconnect_data_v3';

let idCounter = 0;
const genId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

function freshState(): AppState {
  return {
    currentUserId: 'u1',
    users: initialData.mockUsers,
    customers: initialData.mockCustomers,
    locations: initialData.mockLocations,
    workOrders: initialData.mockWorkOrders,
    invoices: initialData.mockInvoices,
    recommendations: initialData.mockRecommendations,
    intake: initialData.mockIntakeItems,
    inventory: initialData.mockInventory,
    equipment: initialData.mockEquipment,
    documents: initialData.mockDocuments,
    closeouts: initialData.mockCloseouts,
    auditLog: initialData.mockAuditLog,
    dismissedRecIds: [],
  };
}

// Parse a free-text labor suggestion like "3.5 hrs standard" into hours.
function parseHours(text: string): number {
  const m = text.match(/(\d+(\.\d+)?)/);
  return m ? parseFloat(m[1]) : 1;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        return { ...freshState(), ...JSON.parse(saved) };
      } catch {
        // fall through to fresh
      }
    }
    return freshState();
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const auth = useAuth();
  // The authenticated user (from the backend) is the single source of truth for
  // identity, role, and audit actor. Domain lists (users/customers/etc.) remain
  // local mock data until later sprints migrate them.
  const currentUser = auth.user ? mapAuthUserToUser(auth.user) : state.users[0];

  const buildEvent = (e: AuditInput): AuditEvent => ({
    id: genId('aud'),
    timestamp: new Date().toISOString(),
    actorId: currentUser.id,
    actor: currentUser.name,
    ...e,
  });

  // Append audit events to a state object (used inside setState updaters).
  const withAudit = (s: AppState, events: AuditInput[]): AuditEvent[] => [
    ...events.map(buildEvent),
    ...s.auditLog,
  ];

  const value: AppContextType = {
    ...state,
    currentUser,
    // Context switching is a dev-only convenience backed by the dev-login
    // endpoint; production bundles never surface a switcher and the backend
    // rejects the call anyway.
    setCurrentUserId: (id) => {
      if (IS_DEV) void auth.devLogin(id);
    },

    logAudit: (e) => setState((s) => ({ ...s, auditLog: withAudit(s, [e]) })),

    updateWorkOrder: (id, data) =>
      setState((s) => {
        const wo = s.workOrders.find((w) => w.id === id);
        const summaryBits: string[] = [];
        if (data.status && wo && data.status !== wo.status) summaryBits.push(`status → ${data.status}`);
        if (data.assignedTechnicianId && wo && data.assignedTechnicianId !== wo.assignedTechnicianId) {
          const tech = s.users.find((u) => u.id === data.assignedTechnicianId);
          summaryBits.push(`assigned to ${tech?.name ?? data.assignedTechnicianId}`);
        }
        if (data.billingStatus && wo && data.billingStatus !== wo.billingStatus) summaryBits.push(`billing → ${data.billingStatus}`);
        const events: AuditInput[] = summaryBits.length
          ? [{ action: 'Updated', entityType: 'WorkOrder', entityId: id, summary: `${wo?.number ?? id}: ${summaryBits.join(', ')}` }]
          : [];
        return {
          ...s,
          workOrders: s.workOrders.map((w) => (w.id === id ? { ...w, ...data } : w)),
          auditLog: events.length ? withAudit(s, events) : s.auditLog,
        };
      }),

    addWorkOrder: (data) =>
      setState((s) => ({
        ...s,
        workOrders: [data, ...s.workOrders],
        auditLog: withAudit(s, [{ action: 'Created', entityType: 'WorkOrder', entityId: data.id, summary: `${data.number} created (${data.source})` }]),
      })),

    updateInvoice: (id, data) =>
      setState((s) => {
        const inv = s.invoices.find((i) => i.id === id);
        const events: AuditInput[] = data.status && inv && data.status !== inv.status
          ? [{ action: 'Updated', entityType: 'Invoice', entityId: id, summary: `${inv?.number ?? id}: ${data.status}` }]
          : [];
        return {
          ...s,
          invoices: s.invoices.map((i) => (i.id === id ? { ...i, ...data } : i)),
          auditLog: events.length ? withAudit(s, events) : s.auditLog,
        };
      }),

    addInvoice: (data) =>
      setState((s) => ({
        ...s,
        invoices: [data, ...s.invoices],
        auditLog: withAudit(s, [{ action: 'Created', entityType: 'Invoice', entityId: data.id, summary: `${data.number} drafted ($${data.amount.toLocaleString()})` }]),
      })),

    dismissRecommendation: (id) =>
      setState((s) => ({
        ...s,
        recommendations: s.recommendations.filter((r) => r.id !== id),
        dismissedRecIds: s.dismissedRecIds.includes(id) ? s.dismissedRecIds : [...s.dismissedRecIds, id],
      })),

    dismissIntake: (id) => setState((s) => ({ ...s, intake: s.intake.filter((i) => i.id !== id) })),

    updateInventory: (id, data) =>
      setState((s) => ({ ...s, inventory: s.inventory.map((it) => (it.id === id ? { ...it, ...data } : it)) })),

    updateCloseout: (id, data) =>
      setState((s) => ({ ...s, closeouts: s.closeouts.map((c) => (c.id === id ? { ...c, ...data } : c)) })),

    // --- Intake → Work Order conversion (creates a real, persisted record) ---
    convertIntakeToWorkOrder: (intakeId, overrides) => {
      // Guard against a stale outer render snapshot; bail early if the item is gone.
      if (!state.intake.some((i) => i.id === intakeId)) return null;
      const newId = genId('wo');
      setState((s) => {
        // Read from the current updater snapshot `s`, not the outer `state`,
        // so rapid repeated conversions compute sequence/lookups correctly.
        const item = s.intake.find((i) => i.id === intakeId);
        if (!item) return s;
        const seq = s.workOrders.length + 1042;
        const cust = s.customers.find((c) => c.id === item.customerId);
        const loc =
          s.locations.find((l) => l.id === (item.locationId ?? '')) ??
          s.locations.find((l) => l.customerId === item.customerId);
        const newWO: WorkOrder = {
          id: newId,
          number: `WO-2026-${seq}`,
          source: item.source,
          customerId: item.customerId,
          locationId: loc?.id ?? '',
          priority: item.priority,
          status: 'Need Scheduled',
          type: 'Service',
          region: loc?.region ?? 'Tampa',
          dueDate: item.requestedDate,
          billingStatus: 'Needs Review',
          description: item.description,
          portalSyncStatus: item.source === 'Manual' ? 'Manual Copy Needed' : 'Draft',
          trips: [],
          labor: [],
          materials: [],
          attachments: [],
          internalLog: [{
            id: genId('log'),
            timestamp: new Date().toISOString(),
            author: currentUser.name,
            message: `Converted from ${item.source} intake.`,
          }],
          createdAt: new Date().toISOString(),
          ...overrides,
        };
        return {
          ...s,
          workOrders: [newWO, ...s.workOrders],
          intake: s.intake.filter((i) => i.id !== intakeId),
          auditLog: withAudit(s, [{
            action: 'Converted',
            entityType: 'Intake',
            entityId: intakeId,
            summary: `${item.source} intake → ${newWO.number} for ${cust?.name ?? 'customer'}`,
          }]),
        };
      });
      return newId;
    },

    addLaborEntry: (workOrderId, entry) =>
      setState((s) => {
        const wo = s.workOrders.find((w) => w.id === workOrderId);
        const full: LaborEntry = { ...entry, id: genId('lab') };
        return {
          ...s,
          workOrders: s.workOrders.map((w) => (w.id === workOrderId ? { ...w, labor: [...w.labor, full] } : w)),
          auditLog: withAudit(s, [{ action: 'Added Labor', entityType: 'WorkOrder', entityId: workOrderId, summary: `${wo?.number ?? workOrderId}: ${entry.hours}h ${entry.type}` }]),
        };
      }),

    addMaterialEntry: (workOrderId, entry) =>
      setState((s) => {
        const wo = s.workOrders.find((w) => w.id === workOrderId);
        const full: MaterialEntry = { ...entry, id: genId('mat') };
        // Deduct from inventory when linked to a stock item.
        const inventory = entry.inventoryItemId
          ? s.inventory.map((it) => (it.id === entry.inventoryItemId ? { ...it, quantity: Math.max(0, it.quantity - entry.quantity), lastUsed: new Date().toISOString() } : it))
          : s.inventory;
        const events: AuditInput[] = [
          { action: 'Added Material', entityType: 'WorkOrder', entityId: workOrderId, summary: `${wo?.number ?? workOrderId}: ${entry.quantity}× ${entry.name}` },
        ];
        if (entry.inventoryItemId) {
          events.push({ action: 'Consumed', entityType: 'Inventory', entityId: entry.inventoryItemId, summary: `-${entry.quantity} ${entry.name} (${wo?.number ?? workOrderId})` });
        }
        return {
          ...s,
          workOrders: s.workOrders.map((w) => (w.id === workOrderId ? { ...w, materials: [...w.materials, full] } : w)),
          inventory,
          auditLog: withAudit(s, events),
        };
      }),

    addWorkOrderNote: (workOrderId, message) =>
      setState((s) => {
        const wo = s.workOrders.find((w) => w.id === workOrderId);
        const note = { id: genId('log'), timestamp: new Date().toISOString(), author: currentUser.name, message };
        return {
          ...s,
          workOrders: s.workOrders.map((w) => (w.id === workOrderId ? { ...w, internalLog: [...w.internalLog, note] } : w)),
          auditLog: withAudit(s, [{ action: 'Note Added', entityType: 'WorkOrder', entityId: workOrderId, summary: `${wo?.number ?? workOrderId}: note added` }]),
        };
      }),

    technicianCheckIn: (workOrderId) =>
      setState((s) => {
        const wo = s.workOrders.find((w) => w.id === workOrderId);
        if (!wo) return s;
        const nowIso = new Date().toISOString();
        const trip = {
          id: genId('trip'),
          tripNumber: (wo.trips[wo.trips.length - 1]?.tripNumber ?? 0) + 1,
          technicianId: wo.assignedTechnicianId ?? currentUser.id,
          date: nowIso,
          checkIn: nowIso,
        };
        return {
          ...s,
          workOrders: s.workOrders.map((w) => (w.id === workOrderId ? { ...w, status: 'On Site', trips: [...w.trips, trip] } : w)),
          auditLog: withAudit(s, [{ action: 'Checked In', entityType: 'WorkOrder', entityId: workOrderId, summary: `${wo.number}: technician on site` }]),
        };
      }),

    technicianCheckOut: (workOrderId, workPerformed) =>
      setState((s) => {
        const wo = s.workOrders.find((w) => w.id === workOrderId);
        if (!wo) return s;
        const nowIso = new Date().toISOString();
        const trips = wo.trips.length
          ? wo.trips.map((t, i) => (i === wo.trips.length - 1 ? { ...t, checkOut: nowIso, workPerformed: workPerformed ?? t.workPerformed } : t))
          : wo.trips;
        return {
          ...s,
          workOrders: s.workOrders.map((w) => (w.id === workOrderId ? { ...w, trips } : w)),
          auditLog: withAudit(s, [{ action: 'Checked Out', entityType: 'WorkOrder', entityId: workOrderId, summary: `${wo.number}: technician checked out` }]),
        };
      }),

    // --- Supervisor approves closeout: populates WO labor/materials, deducts inventory ---
    approveCloseout: (closeoutId) =>
      setState((s) => {
        const co = s.closeouts.find((c) => c.id === closeoutId);
        if (!co) return s;
        // Idempotency guard: only a Pending Review closeout may be approved.
        // Prevents double-posting of labor/materials and double inventory deduction.
        if (co.status !== 'Pending Review') return s;
        const wo = s.workOrders.find((w) => w.id === co.workOrderId);
        if (!wo) return s;
        const events: AuditInput[] = [
          { action: 'Approved', entityType: 'Closeout', entityId: closeoutId, summary: `Closeout approved for ${wo.number}` },
        ];

        // Build labor entry from the AI-suggested labor.
        const laborEntry: LaborEntry = {
          id: genId('lab'),
          technicianId: co.technicianId,
          date: co.submittedAt,
          hours: parseHours(co.laborSuggested),
          rate: s.users.find((u) => u.id === co.technicianId)?.hourlyCost ? 125 : 125,
          type: 'Standard',
          approved: true,
        };

        // Map detected materials to inventory items (by fuzzy name match) and deduct.
        let inventory = [...s.inventory];
        const materialEntries: MaterialEntry[] = co.materialsDetected.map((detected) => {
          const match = inventory.find((it) => detected.toLowerCase().includes(it.name.toLowerCase()) || it.name.toLowerCase().includes(detected.toLowerCase().replace(/^\d+\s*[x×]?\s*/, '')));
          const qtyMatch = detected.match(/^(\d+)/);
          const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
          if (match) {
            inventory = inventory.map((it) => (it.id === match.id ? { ...it, quantity: Math.max(0, it.quantity - qty), lastUsed: new Date().toISOString() } : it));
            events.push({ action: 'Consumed', entityType: 'Inventory', entityId: match.id, summary: `-${qty} ${match.name} (${wo.number})` });
          }
          return {
            id: genId('mat'),
            inventoryItemId: match?.id,
            name: match?.name ?? detected,
            quantity: qty,
            cost: match?.cost ?? 0,
            billablePrice: match?.billablePrice ?? 0,
            approved: true,
          };
        });

        return {
          ...s,
          closeouts: s.closeouts.map((c) => (c.id === closeoutId ? { ...c, status: 'Approved' } : c)),
          inventory,
          workOrders: s.workOrders.map((w) =>
            w.id === wo.id
              ? {
                  ...w,
                  status: 'Ready for Billing',
                  billingStatus: 'Ready for Invoice',
                  labor: [...w.labor, laborEntry],
                  materials: [...w.materials, ...materialEntries],
                  internalLog: [...w.internalLog, { id: genId('log'), timestamp: new Date().toISOString(), author: currentUser.name, message: 'Closeout approved; labor & materials posted, inventory deducted.' }],
                }
              : w
          ),
          auditLog: withAudit(s, events),
        };
      }),

    sendBackCloseout: (closeoutId, reason) =>
      setState((s) => {
        const co = s.closeouts.find((c) => c.id === closeoutId);
        return {
          ...s,
          closeouts: s.closeouts.map((c) => (c.id === closeoutId ? { ...c, status: 'Sent Back' } : c)),
          auditLog: withAudit(s, [{ action: 'Sent Back', entityType: 'Closeout', entityId: closeoutId, summary: `Returned to technician${reason ? `: ${reason}` : ''}${co ? '' : ''}` }]),
        };
      }),

    addCustomer: (data) =>
      setState((s) => ({
        ...s,
        customers: [data, ...s.customers],
        auditLog: withAudit(s, [{ action: 'Created', entityType: 'Customer', entityId: data.id, summary: `Customer ${data.name} created` }]),
      })),

    addLocation: (data) =>
      setState((s) => ({
        ...s,
        locations: [data, ...s.locations],
        auditLog: withAudit(s, [{ action: 'Created', entityType: 'Location', entityId: data.id, summary: `Location ${data.name} created` }]),
      })),

    addEquipment: (data) =>
      setState((s) => ({
        ...s,
        equipment: [data, ...s.equipment],
        auditLog: withAudit(s, [{ action: 'Created', entityType: 'Equipment', entityId: data.id, summary: `Equipment ${data.assetName} created` }]),
      })),

    recordPayment: (invoiceId, amount, type, method = 'Manual') =>
      setState((s) => {
        const inv = s.invoices.find((i) => i.id === invoiceId);
        if (!inv) return s;
        const payment: Payment = {
          id: genId('pay'),
          invoiceId,
          date: new Date().toISOString(),
          amount,
          method,
          type,
          recordedBy: currentUser.name,
        };
        const priorPaid = inv.amountPaid ?? 0;
        const signed = type === 'Refund' ? -Math.abs(amount) : Math.abs(amount);
        // Clamp to [0, amount] so refunds cannot drive paid negative and
        // overpayments cannot exceed the invoice total.
        const amountPaid = Math.max(0, Math.min(inv.amount, priorPaid + signed));
        const fullyPaid = amountPaid >= inv.amount;
        // Recompute status every mutation so a refund on a Paid invoice reverts it.
        const nextStatus: BillingStatus = fullyPaid
          ? 'Paid'
          : inv.status === 'Paid'
            ? 'Invoiced'
            : inv.status;
        return {
          ...s,
          invoices: s.invoices.map((i) =>
            i.id === invoiceId
              ? {
                  ...i,
                  payments: [...(i.payments ?? []), payment],
                  amountPaid,
                  status: nextStatus,
                  paidDate: fullyPaid ? new Date().toISOString() : undefined,
                }
              : i
          ),
          auditLog: withAudit(s, [{ action: type, entityType: 'Payment', entityId: invoiceId, summary: `${inv.number}: ${type} $${amount.toLocaleString()} (${method})` }]),
        };
      }),

    sendPortalUpdate: (workOrderId, status) =>
      setState((s) => {
        const wo = s.workOrders.find((w) => w.id === workOrderId);
        return {
          ...s,
          workOrders: s.workOrders.map((w) => (w.id === workOrderId ? { ...w, portalSyncStatus: status } : w)),
          auditLog: withAudit(s, [{ action: 'Portal Sync', entityType: 'Portal', entityId: workOrderId, summary: `${wo?.number ?? workOrderId} → ${status} (${wo?.source ?? 'portal'}) [SIMULATED]` }]),
        };
      }),

    resetData: () => {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setState(freshState());
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
