import { ROLES, type Role } from "@workspace/db";

export { ROLES };
export type { Role };

export type NavKey =
  | "today"
  | "intake"
  | "work-orders"
  | "dispatch"
  | "technicians"
  | "customers"
  | "locations"
  | "inventory"
  | "equipment"
  | "billing"
  | "accounting"
  | "documents"
  | "reports"
  | "intelligence"
  | "settings"
  | "contracts"
  | "integrations"
  | "portal";

const ALL: NavKey[] = [
  "today", "intake", "work-orders", "dispatch", "technicians", "customers",
  "locations", "inventory", "equipment", "billing", "accounting", "documents",
  "reports", "intelligence", "contracts", "integrations", "settings",
];

// Canonical, backend-enforced role → nav access map (12 roles).
// This is the source of truth. The client mirror lives in
// `artifacts/serviceconnect/src/lib/permissions.ts` (ROLE_NAV) — keep the two
// maps identical so client nav visibility never diverges from server authz.
export const ROLE_NAV: Record<Role, NavKey[]> = {
  Administrator: ALL,
  "Service Manager": ["today", "intake", "work-orders", "dispatch", "technicians", "customers", "locations", "inventory", "equipment", "billing", "documents", "reports", "intelligence", "contracts", "integrations"],
  Scheduler: ["today", "intake", "work-orders", "dispatch", "technicians", "customers", "locations", "inventory", "equipment", "documents", "intelligence", "contracts"],
  Supervisor: ["today", "work-orders", "dispatch", "technicians", "customers", "locations", "equipment", "inventory", "documents", "reports", "intelligence"],
  "Lead Technician": ["today", "work-orders", "dispatch", "technicians", "customers", "locations", "equipment", "inventory"],
  Technician: ["today", "work-orders", "customers", "locations", "equipment", "inventory"],
  Billing: ["today", "work-orders", "customers", "billing", "accounting", "documents", "reports"],
  Bookkeeper: ["today", "billing", "accounting", "documents", "reports"],
  "Inventory Manager": ["today", "work-orders", "inventory", "equipment", "locations", "reports"],
  Sales: ["today", "intake", "work-orders", "customers", "locations", "reports", "intelligence"],
  Subcontractor: ["today", "work-orders"],
  "Customer Portal User": ["portal"],
};

export function isValidRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function isPortalUser(role: Role): boolean {
  return role === "Customer Portal User";
}

// Roles that may create quotes and invoices. Invoice creation is a human
// billing decision — nothing auto-invoices (HITL guardrail).
const BILLING_MANAGE_ROLES: Role[] = [
  "Administrator",
  "Service Manager",
  "Billing",
];
export function canManageBilling(role: Role): boolean {
  return BILLING_MANAGE_ROLES.includes(role);
}

// Quotes can also be authored by Sales.
const QUOTE_MANAGE_ROLES: Role[] = [
  "Administrator",
  "Service Manager",
  "Billing",
  "Sales",
];
export function canManageQuotes(role: Role): boolean {
  return QUOTE_MANAGE_ROLES.includes(role);
}

// Recording a payment updates AR state (no gateway, no ledger).
const PAYMENT_RECORD_ROLES: Role[] = [
  "Administrator",
  "Service Manager",
  "Billing",
  "Bookkeeper",
];
export function canRecordPayment(role: Role): boolean {
  return PAYMENT_RECORD_ROLES.includes(role);
}

// Roles that may create/edit service contracts and recurrence schedules.
const CONTRACT_MANAGE_ROLES: Role[] = [
  "Administrator",
  "Service Manager",
  "Scheduler",
];
export function canManageContracts(role: Role): boolean {
  return CONTRACT_MANAGE_ROLES.includes(role);
}

// Only privileged roles may trigger the recurrence generation worker manually.
export function canRunRecurrence(role: Role): boolean {
  return role === "Administrator" || role === "Service Manager";
}

// Roles that may VIEW integration connections, sync history, and the outbound
// approval queue. Read access for managers; write access is narrower.
const INTEGRATION_VIEW_ROLES: Role[] = ["Administrator", "Service Manager"];
export function canViewIntegrations(role: Role): boolean {
  return INTEGRATION_VIEW_ROLES.includes(role);
}

// Only administrators may change connection state/config, simulate inbound
// traffic, or approve/reject/retry outbound events. Every customer-facing
// outbound submission stays behind this human approval (HITL guardrail).
export function canManageIntegrations(role: Role): boolean {
  return role === "Administrator";
}

export function hasNavAccess(role: Role, key: NavKey): boolean {
  return ROLE_NAV[role]?.includes(key) ?? false;
}

const FIELD_ROLES: Role[] = ["Technician", "Lead Technician", "Subcontractor"];
export function isFieldRole(role: Role): boolean {
  return FIELD_ROLES.includes(role);
}

export function canApproveCloseouts(role: Role): boolean {
  return role === "Service Manager" || role === "Administrator" || role === "Supervisor";
}

// Only these roles may manage users, roles, and invitations.
export function canManageUsers(role: Role): boolean {
  return role === "Administrator";
}

// Roles with scheduling/dispatch authority. Scheduling a work order (moving it
// to "Scheduled" or setting a schedule window) is a human decision restricted to
// these roles — RoseOS never auto-schedules, so the backend enforces approval.
const SCHEDULING_ROLES: Role[] = [
  "Administrator",
  "Service Manager",
  "Scheduler",
  "Supervisor",
];
export function canSchedule(role: Role): boolean {
  return SCHEDULING_ROLES.includes(role);
}

// Roles that may perform inventory mutations (transfers, reservations,
// adjustments, cycle counts, purchase requests).
const INVENTORY_MANAGE_ROLES: Role[] = [
  "Administrator",
  "Service Manager",
  "Inventory Manager",
  "Supervisor",
  "Lead Technician",
];
export function canManageInventory(role: Role): boolean {
  return INVENTORY_MANAGE_ROLES.includes(role);
}

// Privileged roles that may override negative-stock protection and approve /
// receive purchase requests. Deliberately narrower than canManageInventory.
const INVENTORY_PRIVILEGED_ROLES: Role[] = [
  "Administrator",
  "Service Manager",
  "Inventory Manager",
];
export function canOverrideStock(role: Role): boolean {
  return INVENTORY_PRIVILEGED_ROLES.includes(role);
}
export function canApprovePurchase(role: Role): boolean {
  return INVENTORY_PRIVILEGED_ROLES.includes(role);
}

// Roles that may create/edit equipment assets and act on extraction reviews.
const EQUIPMENT_MANAGE_ROLES: Role[] = [
  "Administrator",
  "Service Manager",
  "Scheduler",
  "Supervisor",
  "Inventory Manager",
  "Lead Technician",
  "Technician",
];
export function canManageEquipment(role: Role): boolean {
  return EQUIPMENT_MANAGE_ROLES.includes(role);
}

// Roles that may create/edit vault documents, versions, and reminders.
const DOCUMENT_MANAGE_ROLES: Role[] = [
  "Administrator",
  "Service Manager",
  "Supervisor",
  "Billing",
  "Bookkeeper",
];
export function canManageDocuments(role: Role): boolean {
  return DOCUMENT_MANAGE_ROLES.includes(role);
}

// Document vault visibility gate — mirrors the CustomerDocument.visibility field.
// "Managers Only" is restricted to approver-level roles; "Billing Only" to
// billing/accounting roles (plus admins/managers). "All Staff" is open to any
// authenticated tenant user.
export function canViewDocumentVisibility(
  role: Role,
  visibility: string,
): boolean {
  if (visibility === "Managers Only") {
    return (
      role === "Administrator" ||
      role === "Service Manager" ||
      role === "Supervisor"
    );
  }
  if (visibility === "Billing Only") {
    return (
      role === "Administrator" ||
      role === "Service Manager" ||
      role === "Billing" ||
      role === "Bookkeeper"
    );
  }
  return true;
}

// Customer-portal document gate. Every staff visibility class ("All Staff",
// "Managers Only", "Billing Only") is INTERNAL — none are customer-facing. A
// document only reaches the portal when staff explicitly mark it "Customer
// Visible". Staff can still see these too (canViewDocumentVisibility returns
// true for any non-restricted class), so sharing a doc never hides it internally.
export const CUSTOMER_VISIBLE_DOCUMENT = "Customer Visible";
export function isCustomerVisibleDocument(visibility: string): boolean {
  return visibility === CUSTOMER_VISIBLE_DOCUMENT;
}
