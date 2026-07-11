import { Link } from "wouter";
import { Loader2, ClipboardList, FileText, Receipt, DollarSign, AlertCircle, CalendarClock, ArrowRight } from "lucide-react";
import {
  useGetPortalDashboard,
  type PortalWorkOrder,
  type PortalVisit,
} from "@workspace/api-client-react";
import { money, shortDate, statusClass, priorityClass } from "@/lib/ui";
import type { WorkOrderStatus, Priority } from "@/lib/types";

export default function PortalDashboard() {
  const { data, isLoading, isError } = useGetPortalDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="loading-portal-dashboard">
        <Loader2 className="w-8 h-8 animate-spin text-sc-blue" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="px-6 py-16 text-center" data-testid="error-portal-dashboard">
        <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
        <p className="text-sc-2 mt-3">We couldn't load your dashboard. Please try again.</p>
      </div>
    );
  }

  const kpis = [
    { label: "Open Work Orders", value: data.openWorkOrders, icon: ClipboardList, accent: "var(--sc-blue)", to: "/portal/work-orders" },
    { label: "Pending Quotes", value: data.pendingQuotes, icon: FileText, accent: "var(--sc-orange)", to: "/portal/quotes" },
    { label: "Open Invoices", value: data.openInvoices, icon: Receipt, accent: "var(--sc-blue)", to: "/portal/invoices" },
    { label: "Outstanding Balance", value: money(data.outstandingBalance), icon: DollarSign, accent: "var(--sc-red)", to: "/portal/invoices" },
  ];

  const visits: PortalVisit[] = data.upcomingVisits ?? [];
  const recent: PortalWorkOrder[] = data.recentWorkOrders ?? [];

  return (
    <div className="px-6 py-6 space-y-5 animate-in fade-in duration-500">
      <div>
        <h1 className="text-[28px] leading-none font-bold tracking-tight text-sc" data-testid="text-portal-page-title">
          Dashboard
        </h1>
        <p className="text-sc-2 mt-2 text-sm">A quick overview of your account activity.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.to}>
            <div
              data-testid={`stat-portal-${k.label}`}
              className="relative text-left rounded-xl overflow-hidden p-5 transition-all hover:-translate-y-0.5 cursor-pointer"
              style={{ background: "linear-gradient(160deg, var(--sc-panel-2), var(--sc-panel))", border: "1px solid var(--sc-line)" }}
            >
              <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: k.accent }} />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-medium text-sc-2">{k.label}</p>
                  <p className="text-[32px] leading-tight font-bold text-sc mt-1">{k.value}</p>
                </div>
                <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(67,166,255,0.1)" }}>
                  <k.icon className="w-5 h-5" style={{ color: k.accent }} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="sc-panel p-5">
          <h2 className="text-[15px] font-semibold text-sc flex items-center gap-2 mb-4">
            <CalendarClock className="w-4 h-4 text-sc-blue" /> Upcoming Visits
          </h2>
          {visits.length === 0 ? (
            <div className="text-center py-8 text-sc-3 text-sm" data-testid="empty-portal-visits">No upcoming visits scheduled.</div>
          ) : (
            <div className="space-y-2">
              {visits.map((v, i) => (
                <div
                  key={`${v.date}-${i}`}
                  data-testid={`portal-visit-${i}`}
                  className="flex items-center justify-between rounded-lg px-4 py-3"
                  style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-sc truncate">{v.title}</div>
                    <div className="text-xs text-sc-3 mt-0.5">{shortDate(v.date)}</div>
                  </div>
                  {v.workOrderId && (
                    <Link href={`/portal/work-orders/${v.workOrderId}`}>
                      <span className="text-xs text-sc-blue hover:underline flex items-center gap-1 cursor-pointer" data-testid={`link-portal-visit-wo-${i}`}>
                        View <ArrowRight className="w-3 h-3" />
                      </span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="sc-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-sc flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-sc-blue" /> Recent Work Orders
            </h2>
            <Link href="/portal/work-orders">
              <span className="text-xs text-sc-blue hover:underline flex items-center gap-1 cursor-pointer" data-testid="link-portal-all-workorders">
                View all <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-8 text-sc-3 text-sm" data-testid="empty-portal-recent-workorders">No recent work orders.</div>
          ) : (
            <div className="space-y-2">
              {recent.map((wo) => (
                <Link key={wo.id} href={`/portal/work-orders/${wo.id}`}>
                  <div
                    data-testid={`card-portal-workorder-${wo.id}`}
                    className="rounded-lg px-4 py-3 transition-colors hover:border-[var(--sc-blue)] cursor-pointer"
                    style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-sc">{wo.number}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-md border ${statusClass(wo.status as WorkOrderStatus)}`}>{wo.status}</span>
                    </div>
                    <p className="text-xs text-sc-2 mt-1 line-clamp-1">{wo.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityClass(wo.priority as Priority)}`}>{wo.priority}</span>
                      <span className="text-[11px] text-sc-3">Due {shortDate(wo.dueDate)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
