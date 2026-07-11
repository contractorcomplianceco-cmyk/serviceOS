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
  | "portal";

const ALL: NavKey[] = [
  "today", "intake", "work-orders", "dispatch", "technicians", "customers",
  "locations", "inventory", "equipment", "billing", "accounting", "documents",
  "reports", "intelligence", "settings",
];

// Canonical, backend-enforced role → nav access map (12 roles).
// This is the source of truth. The client mirror lives in
// `artifacts/serviceconnect/src/lib/permissions.ts` (ROLE_NAV) — keep the two
// maps identical so client nav visibility never diverges from server authz.
export const ROLE_NAV: Record<Role, NavKey[]> = {
  Administrator: ALL,
  "Service Manager": ["today", "intake", "work-orders", "dispatch", "technicians", "customers", "locations", "inventory", "equipment", "billing", "documents", "reports", "intelligence"],
  Scheduler: ["today", "intake", "work-orders", "dispatch", "technicians", "customers", "locations", "inventory", "equipment", "documents", "intelligence"],
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
