import { eq } from "drizzle-orm";
import {
  db,
  workOrdersTable,
  invoicesTable,
  customersTable,
  usersTable,
} from "@workspace/db";

export interface ReportMetric {
  label: string;
  value: number;
  format: string | null;
}
export interface ReportSeriesPoint {
  name: string;
  value: number;
}
export interface ReportsResponse {
  generatedAt: string;
  disclaimer: string;
  operational: {
    metrics: ReportMetric[];
    workOrdersByStatus: ReportSeriesPoint[];
    workOrdersByPriority: ReportSeriesPoint[];
    techUtilization: ReportSeriesPoint[];
  };
  financial: {
    label: string;
    metrics: ReportMetric[];
    arAging: ReportSeriesPoint[];
    revenueByCustomer: ReportSeriesPoint[];
  };
}

function tally(items: string[]): ReportSeriesPoint[] {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = it || "Unspecified";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

// Build backend-derived operational and financial reports from live tenant data.
// NOTE: financial figures are billing/AR rollups only — NOT general-ledger P&L
// or balance-sheet statements. The disclaimer makes this explicit.
export async function buildReports(tenantId: string): Promise<ReportsResponse> {
  const [workOrders, invoices, customers, users] = await Promise.all([
    db.select().from(workOrdersTable).where(eq(workOrdersTable.tenantId, tenantId)),
    db.select().from(invoicesTable).where(eq(invoicesTable.tenantId, tenantId)),
    db.select().from(customersTable).where(eq(customersTable.tenantId, tenantId)),
    db.select().from(usersTable).where(eq(usersTable.tenantId, tenantId)),
  ]);

  const now = new Date();
  const openWo = workOrders.filter(
    (w) => w.status !== "Completed" && w.status !== "Closed" && w.status !== "Cancelled",
  );

  const workOrdersByStatus = tally(workOrders.map((w) => w.status));
  const workOrdersByPriority = tally(workOrders.map((w) => w.priority));

  // Technician utilization: assigned open work orders per technician.
  const techNames = new Map<string, string>(
    users.map((u) => [u.id, u.name]),
  );
  const utilMap = new Map<string, number>();
  for (const w of openWo) {
    if (!w.assignedTechnicianId) continue;
    const name = techNames.get(w.assignedTechnicianId) ?? "Unknown";
    utilMap.set(name, (utilMap.get(name) ?? 0) + 1);
  }
  const techUtilization = [...utilMap.entries()].map(([name, value]) => ({
    name,
    value,
  }));

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.amountPaid, 0);
  const outstanding = totalInvoiced - totalPaid;

  // AR aging by invoice age buckets on the unpaid balance.
  const buckets: Record<string, number> = {
    Current: 0,
    "1-30": 0,
    "31-60": 0,
    "61-90": 0,
    "90+": 0,
  };
  for (const inv of invoices) {
    const bal = inv.amount - inv.amountPaid;
    if (bal <= 0.005) continue;
    const age = daysBetween(now, inv.createdAt);
    if (age <= 0) buckets["Current"] += bal;
    else if (age <= 30) buckets["1-30"] += bal;
    else if (age <= 60) buckets["31-60"] += bal;
    else if (age <= 90) buckets["61-90"] += bal;
    else buckets["90+"] += bal;
  }
  const arAging = Object.entries(buckets).map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100,
  }));

  // Revenue by customer (top 8 by invoiced amount).
  const custNames = new Map<string, string>(customers.map((c) => [c.id, c.name]));
  const revMap = new Map<string, number>();
  for (const inv of invoices) {
    const name = custNames.get(inv.customerId) ?? "Unknown";
    revMap.set(name, (revMap.get(name) ?? 0) + inv.amount);
  }
  const revenueByCustomer = [...revMap.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return {
    generatedAt: now.toISOString(),
    disclaimer:
      "Operational and billing/AR figures derived from live ServiceConnect data. These are NOT general-ledger financial statements (no P&L or balance sheet) and should not be used for accounting close.",
    operational: {
      metrics: [
        { label: "Total Work Orders", value: workOrders.length, format: "int" },
        { label: "Open Work Orders", value: openWo.length, format: "int" },
        {
          label: "Emergency / Urgent",
          value: workOrders.filter((w) => w.priority === "Emergency" || w.priority === "Urgent").length,
          format: "int",
        },
        { label: "Active Customers", value: customers.filter((c) => c.status === "Active").length, format: "int" },
      ],
      workOrdersByStatus,
      workOrdersByPriority,
      techUtilization,
    },
    financial: {
      label: "Billing & AR (non-GL)",
      metrics: [
        { label: "Total Invoiced", value: Math.round(totalInvoiced * 100) / 100, format: "money" },
        { label: "Total Collected", value: Math.round(totalPaid * 100) / 100, format: "money" },
        { label: "Outstanding AR", value: Math.round(outstanding * 100) / 100, format: "money" },
        { label: "Open Invoices", value: invoices.filter((i) => i.amount - i.amountPaid > 0.005).length, format: "int" },
      ],
      arAging,
      revenueByCustomer,
    },
  };
}
