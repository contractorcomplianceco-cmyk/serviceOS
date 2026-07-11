import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User, Customer, Location, WorkOrder, Invoice, AIRecommendation,
  IntakeItem, InventoryItem, Equipment, CustomerDocument, Closeout,
} from './types';
import * as initialData from './mock-data';

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
}

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'serviceconnect_data_v2';

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
  };
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

  const currentUser = state.users.find((u) => u.id === state.currentUserId) ?? state.users[0];

  const value: AppContextType = {
    ...state,
    currentUser,
    setCurrentUserId: (id) => setState((s) => ({ ...s, currentUserId: id })),
    updateWorkOrder: (id, data) =>
      setState((s) => ({ ...s, workOrders: s.workOrders.map((wo) => (wo.id === id ? { ...wo, ...data } : wo)) })),
    addWorkOrder: (data) => setState((s) => ({ ...s, workOrders: [data, ...s.workOrders] })),
    updateInvoice: (id, data) =>
      setState((s) => ({ ...s, invoices: s.invoices.map((inv) => (inv.id === id ? { ...inv, ...data } : inv)) })),
    addInvoice: (data) => setState((s) => ({ ...s, invoices: [data, ...s.invoices] })),
    dismissRecommendation: (id) =>
      setState((s) => ({ ...s, recommendations: s.recommendations.filter((r) => r.id !== id) })),
    dismissIntake: (id) => setState((s) => ({ ...s, intake: s.intake.filter((i) => i.id !== id) })),
    updateInventory: (id, data) =>
      setState((s) => ({ ...s, inventory: s.inventory.map((it) => (it.id === id ? { ...it, ...data } : it)) })),
    updateCloseout: (id, data) =>
      setState((s) => ({ ...s, closeouts: s.closeouts.map((c) => (c.id === id ? { ...c, ...data } : c)) })),
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
