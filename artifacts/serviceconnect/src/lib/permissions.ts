import { Role } from './types';

export type NavKey =
  | 'today'
  | 'intake'
  | 'work-orders'
  | 'dispatch'
  | 'technicians'
  | 'customers'
  | 'locations'
  | 'inventory'
  | 'equipment'
  | 'billing'
  | 'accounting'
  | 'documents'
  | 'reports'
  | 'intelligence'
  | 'settings'
  | 'contracts'
  | 'integrations'
  | 'portal';

const ALL: NavKey[] = [
  'today', 'intake', 'work-orders', 'dispatch', 'technicians', 'customers',
  'locations', 'inventory', 'equipment', 'billing', 'accounting', 'documents',
  'reports', 'intelligence', 'contracts', 'integrations', 'settings',
];

// IMPORTANT: this map is the client mirror of the backend-enforced source of
// truth in `artifacts/api-server/src/lib/authz.ts` (ROLE_NAV). The server is
// authoritative — keep the two maps identical so client nav visibility never
// diverges from server-side authorization.
const ROLE_NAV: Record<Role, NavKey[]> = {
  Administrator: ALL,
  'Service Manager': ['today', 'intake', 'work-orders', 'dispatch', 'technicians', 'customers', 'locations', 'inventory', 'equipment', 'billing', 'documents', 'reports', 'intelligence', 'contracts', 'integrations'],
  Scheduler: ['today', 'intake', 'work-orders', 'dispatch', 'technicians', 'customers', 'locations', 'inventory', 'equipment', 'documents', 'intelligence', 'contracts'],
  Supervisor: ['today', 'work-orders', 'dispatch', 'technicians', 'customers', 'locations', 'equipment', 'inventory', 'documents', 'reports', 'intelligence'],
  'Lead Technician': ['today', 'work-orders', 'dispatch', 'technicians', 'customers', 'locations', 'equipment', 'inventory'],
  Technician: ['today', 'work-orders', 'customers', 'locations', 'equipment', 'inventory'],
  Billing: ['today', 'work-orders', 'customers', 'billing', 'accounting', 'documents', 'reports'],
  Bookkeeper: ['today', 'billing', 'accounting', 'documents', 'reports'],
  'Inventory Manager': ['today', 'work-orders', 'inventory', 'equipment', 'locations', 'reports'],
  Sales: ['today', 'intake', 'work-orders', 'customers', 'locations', 'reports', 'intelligence'],
  Subcontractor: ['today', 'work-orders'],
  'Customer Portal User': ['portal'],
};

export function canAccess(role: Role, key: NavKey): boolean {
  return ROLE_NAV[role]?.includes(key) ?? false;
}

export function navFor(role: Role): NavKey[] {
  return ROLE_NAV[role] ?? ['today'];
}

const FIELD_ROLES: Role[] = ['Technician', 'Lead Technician', 'Subcontractor'];

export function isFieldRole(role: Role): boolean {
  return FIELD_ROLES.includes(role);
}

// Closeout approval is the human-in-the-loop gate before anything reaches billing.
// Only these roles may approve or send back technician closeouts.
export function canApproveCloseouts(role: Role): boolean {
  return role === 'Service Manager' || role === 'Administrator' || role === 'Supervisor';
}

// Integration access mirrors the backend authz source of truth. Managers may
// VIEW connections, sync history, and the outbound approval queue; only
// administrators may change state, simulate inbound, or approve/reject/retry
// events — every customer-facing outbound send stays behind human approval.
const INTEGRATION_VIEW_ROLES: Role[] = ['Administrator', 'Service Manager'];
export function canViewIntegrations(role: Role): boolean {
  return INTEGRATION_VIEW_ROLES.includes(role);
}

export function canManageIntegrations(role: Role): boolean {
  return role === 'Administrator';
}

// Customer-facing notifications are held at PendingApproval and released only by
// a human (HITL). Any staff (non-portal) role may approve, mirroring the backend
// `isStaff` check in `authz.ts` used by the approve/retry routes.
export function canApproveNotifications(role: Role): boolean {
  return role !== 'Customer Portal User';
}

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  Administrator: 'Full access to all operations, billing, and settings.',
  'Service Manager': 'Oversees jobs, approvals, technicians, and reporting.',
  Scheduler: 'Manages intake, dispatch, and technician assignments.',
  Supervisor: 'Reviews closeouts and oversees field crews and dispatch.',
  'Lead Technician': 'Field lead with dispatch and crew visibility.',
  Technician: 'Field access to assigned jobs, customers, and inventory.',
  Billing: 'Handles invoicing, AR, and billing documents.',
  Bookkeeper: 'Read-only accounting, AR, and reporting.',
  'Inventory Manager': 'Manages stock, equipment, and warehouse locations.',
  Sales: 'Handles intake, quotes, customers, and pipeline reporting.',
  Subcontractor: 'Limited access to assigned work orders only.',
  'Customer Portal User': 'Customer-facing view of their own work orders.',
};

export function roleDescription(role: Role): string {
  return ROLE_DESCRIPTIONS[role];
}
