import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  User, Customer, Location, WorkOrder, Invoice, AIRecommendation,
  IntakeItem, InventoryItem, Equipment, CustomerDocument, Closeout,
  AuditEvent, Payment, PaymentType, LaborEntry, MaterialEntry, PortalSyncStatus,
  BillingStatus,
} from './types';
import * as initialData from './mock-data';
import { useAuth, mapAuthUserToUser, IS_DEV } from './auth';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListCustomers, useCreateCustomer,
  useListLocations, useCreateLocation,
  useListEmployees,
  useListInventory,
  useListIntake, useDismissIntake, useConvertIntake,
  useListWorkOrders, useCreateWorkOrder, useUpdateWorkOrder,
  useAddLaborEntry, useAddMaterialEntry, useAddWorkOrderNote,
  useTechnicianCheckIn, useTechnicianCheckOut,
  useListCloseouts, useUpdateCloseout, useApproveCloseout, useSendBackCloseout,
  useListAuditEvents,
  getListCustomersQueryKey, getListLocationsQueryKey, getListInventoryQueryKey,
  getListIntakeQueryKey, getListWorkOrdersQueryKey, getListCloseoutsQueryKey,
  getListEmployeesQueryKey, getListAuditEventsQueryKey,
  type CustomerInput, type LocationInput, type WorkOrderInput,
  type WorkOrderUpdate, type CloseoutUpdate,
} from '@workspace/api-client-react';

// ---------------------------------------------------------------------------
// Local-only slice. Billing (invoices/payments), equipment, documents, and AI
// recommendations remain client-side this sprint; the operational spine
// (customers/locations/work orders/intake/inventory/closeouts/audit) is served
// from the backend via react-query below.
// ---------------------------------------------------------------------------
interface LocalState {
  invoices: Invoice[];
  equipment: Equipment[];
  documents: CustomerDocument[];
  recommendations: AIRecommendation[];
  dismissedRecIds: string[];
  // Ephemeral, client-generated audit for local-only actions (portal sync,
  // payments, etc.). Backend mutations write their own authoritative audit.
  localAudit: AuditEvent[];
}

type AuditInput = Pick<AuditEvent, 'action' | 'entityType' | 'entityId' | 'summary'>;

interface AppContextType {
  currentUser: User;
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
  setCurrentUserId: (id: string) => void;
  updateWorkOrder: (id: string, data: Partial<WorkOrder>) => void;
  addWorkOrder: (data: WorkOrder) => Promise<WorkOrder | null>;
  updateInvoice: (id: string, data: Partial<Invoice>) => void;
  addInvoice: (data: Invoice) => void;
  dismissRecommendation: (id: string) => void;
  dismissIntake: (id: string) => void;
  updateInventory: (id: string, data: Partial<InventoryItem>) => void;
  updateCloseout: (id: string, data: Partial<Closeout>) => void;
  resetData: () => void;
  logAudit: (e: AuditInput) => void;
  convertIntakeToWorkOrder: (intakeId: string) => Promise<string | null>;
  addLaborEntry: (workOrderId: string, entry: Omit<LaborEntry, 'id'>) => void;
  addMaterialEntry: (workOrderId: string, entry: Omit<MaterialEntry, 'id'>) => void;
  addWorkOrderNote: (workOrderId: string, message: string) => void;
  technicianCheckIn: (workOrderId: string) => void;
  technicianCheckOut: (workOrderId: string, workPerformed?: string) => void;
  approveCloseout: (closeoutId: string) => void;
  sendBackCloseout: (closeoutId: string, reason?: string) => void;
  addCustomer: (data: Customer) => Promise<Customer | null>;
  addLocation: (data: Location) => void;
  addEquipment: (data: Equipment) => void;
  recordPayment: (invoiceId: string, amount: number, type: PaymentType, method?: string) => void;
  sendPortalUpdate: (workOrderId: string, status: PortalSyncStatus) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'serviceconnect_local_v4';

let idCounter = 0;
const genId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

function freshLocal(): LocalState {
  return {
    invoices: initialData.mockInvoices,
    equipment: initialData.mockEquipment,
    documents: initialData.mockDocuments,
    recommendations: initialData.mockRecommendations,
    dismissedRecIds: [],
    localAudit: [],
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [local, setLocal] = useState<LocalState>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        return { ...freshLocal(), ...JSON.parse(saved) };
      } catch {
        // fall through to fresh
      }
    }
    return freshLocal();
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local));
  }, [local]);

  const auth = useAuth();
  const currentUser = auth.user
    ? mapAuthUserToUser(auth.user)
    : initialData.mockUsers[0];
  const authed = !!auth.user;

  const qc = useQueryClient();
  const kCustomers = getListCustomersQueryKey();
  const kLocations = getListLocationsQueryKey();
  const kEmployees = getListEmployeesQueryKey();
  const kInventory = getListInventoryQueryKey();
  const kIntake = getListIntakeQueryKey();
  const kWorkOrders = getListWorkOrdersQueryKey();
  const kCloseouts = getListCloseoutsQueryKey();
  const kAudit = getListAuditEventsQueryKey();

  const invalidate = useCallback(
    (keys: readonly (readonly unknown[])[]) => {
      for (const key of keys) void qc.invalidateQueries({ queryKey: key });
    },
    [qc],
  );

  // --- Reads -------------------------------------------------------------
  const customersQuery = useListCustomers({ query: { enabled: authed, queryKey: kCustomers } });
  const locationsQuery = useListLocations({ query: { enabled: authed, queryKey: kLocations } });
  const employeesQuery = useListEmployees({ query: { enabled: authed, queryKey: kEmployees } });
  const inventoryQuery = useListInventory({ query: { enabled: authed, queryKey: kInventory } });
  const intakeQuery = useListIntake({ query: { enabled: authed, queryKey: kIntake } });
  const workOrdersQuery = useListWorkOrders({ query: { enabled: authed, queryKey: kWorkOrders } });
  const closeoutsQuery = useListCloseouts({ query: { enabled: authed, queryKey: kCloseouts } });
  const auditQuery = useListAuditEvents(undefined, { query: { enabled: authed, queryKey: kAudit } });

  // The generated schema types widen enums to `string` and use `null` for
  // optionals; they are structurally the frontend shapes at runtime, so we
  // present them as the domain types the pages already consume.
  const customers = (customersQuery.data ?? []) as unknown as Customer[];
  const locations = (locationsQuery.data ?? []) as unknown as Location[];
  const inventory = (inventoryQuery.data ?? []) as unknown as InventoryItem[];
  const intake = (intakeQuery.data ?? []) as unknown as IntakeItem[];
  const workOrders = (workOrdersQuery.data ?? []) as unknown as WorkOrder[];
  const closeouts = (closeoutsQuery.data ?? []) as unknown as Closeout[];

  const employees = (employeesQuery.data ?? []).map(mapAuthUserToUser);
  const users = employees.length ? employees : [currentUser];

  const backendAudit: AuditEvent[] = (auditQuery.data ?? []).map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    actorId: e.actorUserId ?? '',
    actor: e.actorName,
    action: e.action,
    entityType: e.entityType as AuditEvent['entityType'],
    entityId: e.entityId,
    summary: e.summary,
  }));
  const auditLog = [...local.localAudit, ...backendAudit];

  const recommendations = local.recommendations.filter(
    (r) => !local.dismissedRecIds.includes(r.id),
  );

  // --- Local audit helpers (for client-only actions) ---------------------
  const buildEvent = (e: AuditInput): AuditEvent => ({
    id: genId('aud'),
    timestamp: new Date().toISOString(),
    actorId: currentUser.id,
    actor: currentUser.name,
    ...e,
  });
  const pushLocalAudit = (events: AuditInput[]) =>
    setLocal((s) => ({
      ...s,
      localAudit: [...events.map(buildEvent), ...s.localAudit],
    }));

  // --- Mutations (with cache invalidation) -------------------------------
  const createCustomerM = useCreateCustomer({
    mutation: { onSuccess: () => invalidate([kCustomers, kAudit]) },
  });
  const createLocationM = useCreateLocation({
    mutation: { onSuccess: () => invalidate([kLocations, kAudit]) },
  });
  const createWorkOrderM = useCreateWorkOrder({
    mutation: { onSuccess: () => invalidate([kWorkOrders, kAudit]) },
  });
  const updateWorkOrderM = useUpdateWorkOrder({
    mutation: { onSuccess: () => invalidate([kWorkOrders, kAudit]) },
  });
  const addLaborM = useAddLaborEntry({
    mutation: { onSuccess: () => invalidate([kWorkOrders, kAudit]) },
  });
  const addMaterialM = useAddMaterialEntry({
    mutation: { onSuccess: () => invalidate([kWorkOrders, kInventory, kAudit]) },
  });
  const addNoteM = useAddWorkOrderNote({
    mutation: { onSuccess: () => invalidate([kWorkOrders, kAudit]) },
  });
  const checkInM = useTechnicianCheckIn({
    mutation: { onSuccess: () => invalidate([kWorkOrders, kAudit]) },
  });
  const checkOutM = useTechnicianCheckOut({
    mutation: { onSuccess: () => invalidate([kWorkOrders, kAudit]) },
  });
  const dismissIntakeM = useDismissIntake({
    mutation: { onSuccess: () => invalidate([kIntake, kAudit]) },
  });
  const convertIntakeM = useConvertIntake({
    mutation: { onSuccess: () => invalidate([kIntake, kWorkOrders, kAudit]) },
  });
  const updateCloseoutM = useUpdateCloseout({
    mutation: { onSuccess: () => invalidate([kCloseouts]) },
  });
  const approveCloseoutM = useApproveCloseout({
    mutation: {
      onSuccess: () =>
        invalidate([kCloseouts, kWorkOrders, kInventory, kAudit]),
    },
  });
  const sendBackCloseoutM = useSendBackCloseout({
    mutation: { onSuccess: () => invalidate([kCloseouts, kAudit]) },
  });

  const value: AppContextType = {
    currentUser,
    users,
    customers,
    locations,
    workOrders,
    invoices: local.invoices,
    recommendations,
    intake,
    inventory,
    equipment: local.equipment,
    documents: local.documents,
    closeouts,
    auditLog,
    dismissedRecIds: local.dismissedRecIds,

    // Context switching is a dev-only convenience backed by the dev-login
    // endpoint; production bundles never surface a switcher.
    setCurrentUserId: (id) => {
      if (IS_DEV) void auth.devLogin(id);
    },

    logAudit: (e) => pushLocalAudit([e]),

    updateWorkOrder: (id, data) => {
      updateWorkOrderM.mutate({ id, data: data as unknown as WorkOrderUpdate });
    },

    addWorkOrder: async (data) => {
      const input: WorkOrderInput = {
        number: data.number,
        source: data.source,
        customerId: data.customerId,
        locationId: data.locationId,
        poNumber: data.poNumber,
        referenceNumber: data.referenceNumber,
        externalId: data.externalId,
        priority: data.priority,
        status: data.status,
        type: data.type,
        region: data.region,
        dueDate: data.dueDate,
        billingStatus: data.billingStatus,
        accountManagerId: data.accountManagerId,
        serviceManagerId: data.serviceManagerId,
        assignedTechnicianId: data.assignedTechnicianId,
        timeWindow: data.timeWindow,
        description: data.description,
        importantNotes: data.importantNotes,
        locationNotes: data.locationNotes,
        quoteNotes: data.quoteNotes,
        portalSyncStatus: data.portalSyncStatus,
        materialsFlag: data.materialsFlag,
        quoteFlag: data.quoteFlag,
      };
      try {
        const created = await createWorkOrderM.mutateAsync({ data: input });
        return created as unknown as WorkOrder;
      } catch {
        return null;
      }
    },

    // Billing stays local this sprint.
    updateInvoice: (id, data) =>
      setLocal((s) => {
        const inv = s.invoices.find((i) => i.id === id);
        const events: AuditInput[] =
          data.status && inv && data.status !== inv.status
            ? [{ action: 'Updated', entityType: 'Invoice', entityId: id, summary: `${inv?.number ?? id}: ${data.status}` }]
            : [];
        return {
          ...s,
          invoices: s.invoices.map((i) => (i.id === id ? { ...i, ...data } : i)),
          localAudit: events.length ? [...events.map(buildEvent), ...s.localAudit] : s.localAudit,
        };
      }),

    addInvoice: (data) =>
      setLocal((s) => ({
        ...s,
        invoices: [data, ...s.invoices],
        localAudit: [buildEvent({ action: 'Created', entityType: 'Invoice', entityId: data.id, summary: `${data.number} drafted ($${data.amount.toLocaleString()})` }), ...s.localAudit],
      })),

    dismissRecommendation: (id) =>
      setLocal((s) => ({
        ...s,
        dismissedRecIds: s.dismissedRecIds.includes(id) ? s.dismissedRecIds : [...s.dismissedRecIds, id],
      })),

    dismissIntake: (id) => {
      dismissIntakeM.mutate({ id });
    },

    // Inventory is read-only from the backend this sprint; deductions happen
    // server-side on material add / closeout approval.
    updateInventory: () => {
      /* no-op: inventory mutations are downstream work */
    },

    updateCloseout: (id, data) => {
      updateCloseoutM.mutate({ id, data: data as unknown as CloseoutUpdate });
    },

    convertIntakeToWorkOrder: async (intakeId) => {
      try {
        const wo = await convertIntakeM.mutateAsync({ id: intakeId });
        return (wo as unknown as WorkOrder).id;
      } catch {
        return null;
      }
    },

    addLaborEntry: (workOrderId, entry) => {
      addLaborM.mutate({ id: workOrderId, data: entry });
    },

    addMaterialEntry: (workOrderId, entry) => {
      addMaterialM.mutate({ id: workOrderId, data: entry });
    },

    addWorkOrderNote: (workOrderId, message) => {
      addNoteM.mutate({ id: workOrderId, data: { message } });
    },

    technicianCheckIn: (workOrderId) => {
      checkInM.mutate({ id: workOrderId, data: {} });
    },

    technicianCheckOut: (workOrderId, workPerformed) => {
      checkOutM.mutate({ id: workOrderId, data: workPerformed ? { workPerformed } : {} });
    },

    approveCloseout: (closeoutId) => {
      approveCloseoutM.mutate({ id: closeoutId });
    },

    sendBackCloseout: (closeoutId, reason) => {
      sendBackCloseoutM.mutate({ id: closeoutId, data: reason ? { reason } : {} });
    },

    addCustomer: async (data) => {
      const input: CustomerInput = {
        name: data.name,
        industry: data.industry,
        phone: data.phone,
        email: data.email,
        status: data.status,
        accountManagerId: data.accountManagerId,
        tags: data.tags,
        contacts: data.contacts,
        rateRules: data.rateRules,
        requirements: data.requirements,
        portalRules: data.portalRules,
        taxCode: data.taxCode,
      };
      try {
        const created = await createCustomerM.mutateAsync({ data: input });
        return created as unknown as Customer;
      } catch {
        return null;
      }
    },

    addLocation: (data) => {
      const input: LocationInput = {
        customerId: data.customerId,
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        region: data.region,
        notes: data.notes,
      };
      createLocationM.mutate({ data: input });
    },

    addEquipment: (data) =>
      setLocal((s) => ({
        ...s,
        equipment: [data, ...s.equipment],
        localAudit: [buildEvent({ action: 'Created', entityType: 'Equipment', entityId: data.id, summary: `Equipment ${data.assetName} created` }), ...s.localAudit],
      })),

    recordPayment: (invoiceId, amount, type, method = 'Manual') =>
      setLocal((s) => {
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
        const amountPaid = Math.max(0, Math.min(inv.amount, priorPaid + signed));
        const fullyPaid = amountPaid >= inv.amount;
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
              : i,
          ),
          localAudit: [buildEvent({ action: type, entityType: 'Payment', entityId: invoiceId, summary: `${inv.number}: ${type} $${amount.toLocaleString()} (${method})` }), ...s.localAudit],
        };
      }),

    sendPortalUpdate: (workOrderId, status) => {
      const wo = workOrders.find((w) => w.id === workOrderId);
      pushLocalAudit([{ action: 'Portal Sync', entityType: 'Portal', entityId: workOrderId, summary: `${wo?.number ?? workOrderId} → ${status} (${wo?.source ?? 'portal'}) [SIMULATED]` }]);
    },

    resetData: () => {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setLocal(freshLocal());
      invalidate([kCustomers, kLocations, kEmployees, kInventory, kIntake, kWorkOrders, kCloseouts, kAudit]);
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
