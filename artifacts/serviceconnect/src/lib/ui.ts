import { Priority, WorkOrderStatus, BillingStatus, PortalSyncStatus } from './types';

export function priorityClass(p: Priority): string {
  switch (p) {
    case 'Emergency':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'High':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    case 'Medium':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

const GREEN = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
const BLUE = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
const AMBER = 'bg-amber-500/10 text-amber-600 border-amber-500/30';
const RED = 'bg-destructive/10 text-destructive border-destructive/20';
const SLATE = 'bg-slate-100 text-slate-600 border-slate-200';

export function statusClass(s: WorkOrderStatus): string {
  switch (s) {
    case 'New':
    case 'Triage Needed':
      return RED;
    case 'Need Scheduled':
    case 'Awaiting Materials':
    case 'Awaiting Quote Approval':
    case 'Return Trip Needed':
      return AMBER;
    case 'Scheduled':
    case 'First Trip':
    case 'On Site':
      return BLUE;
    case 'Completed Pending Review':
    case 'Ready for Billing':
    case 'Invoiced':
    case 'Closed':
      return GREEN;
    case 'Cancelled':
      return SLATE;
    default:
      return SLATE;
  }
}

export function billingClass(s: BillingStatus): string {
  switch (s) {
    case 'Paid':
    case 'Invoiced':
    case 'Ready for Invoice':
      return GREEN;
    case 'Needs Review':
    case 'Waiting on Approval':
      return BLUE;
    case 'Missing Info':
      return AMBER;
    case 'Past Due':
      return RED;
    default:
      return SLATE;
  }
}

export function portalClass(s: PortalSyncStatus): string {
  switch (s) {
    case 'Sent':
      return GREEN;
    case 'Ready to Send':
      return BLUE;
    case 'Needs Approval':
    case 'Manual Copy Needed':
      return AMBER;
    case 'Failed':
      return RED;
    default:
      return SLATE;
  }
}

export function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function shortDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function relativeDay(iso: string): string {
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  return `In ${diff}d`;
}
