import { Link, useRoute } from "wouter";
import { Loader2, AlertCircle, ArrowLeft, Clock, CalendarClock, MessageSquare, MapPin } from "lucide-react";
import { useGetPortalWorkOrder, getGetPortalWorkOrderQueryKey } from "@workspace/api-client-react";
import { shortDate, statusClass, priorityClass } from "@/lib/ui";
import type { WorkOrderStatus, Priority } from "@/lib/types";

export default function PortalWorkOrderDetail() {
  const [, params] = useRoute("/portal/work-orders/:id");
  const id = params?.id ?? "";
  const { data, isLoading, isError } = useGetPortalWorkOrder(id, {
    query: { queryKey: getGetPortalWorkOrderQueryKey(id), enabled: !!id },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="loading-portal-workorder-detail">
        <Loader2 className="w-8 h-8 animate-spin text-sc-blue" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="px-6 py-16 text-center" data-testid="error-portal-workorder-detail">
        <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
        <p className="text-sc-2 mt-3">We couldn't load this work order.</p>
        <Link href="/portal/work-orders">
          <span className="text-sc-blue text-sm hover:underline mt-3 inline-block cursor-pointer" data-testid="link-portal-back-workorders">Back to work orders</span>
        </Link>
      </div>
    );
  }

  const visits = data.visits ?? [];
  const updates = data.updates ?? [];

  return (
    <div className="px-6 py-6 space-y-5 animate-in fade-in duration-500 max-w-4xl">
      <Link href="/portal/work-orders">
        <span className="text-sm text-sc-2 hover:text-white flex items-center gap-2 cursor-pointer w-fit" data-testid="link-portal-back-workorders">
          <ArrowLeft className="w-4 h-4" /> Back to work orders
        </span>
      </Link>

      <div className="sc-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-sc" data-testid="text-portal-workorder-number">{data.number}</h1>
            <p className="text-sc-2 mt-2 max-w-2xl">{data.description}</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-md border ${statusClass(data.status as WorkOrderStatus)}`} data-testid="badge-portal-workorder-status">{data.status}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div>
            <div className="text-[11px] text-sc-3 uppercase tracking-wide">Priority</div>
            <span className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded border ${priorityClass(data.priority as Priority)}`}>{data.priority}</span>
          </div>
          <div>
            <div className="text-[11px] text-sc-3 uppercase tracking-wide">Type</div>
            <div className="text-sm font-medium text-sc mt-1">{data.type}</div>
          </div>
          <div>
            <div className="text-[11px] text-sc-3 uppercase tracking-wide">Due Date</div>
            <div className="text-sm font-medium text-sc mt-1">{shortDate(data.dueDate)}</div>
          </div>
          <div>
            <div className="text-[11px] text-sc-3 uppercase tracking-wide">Created</div>
            <div className="text-sm font-medium text-sc mt-1">{shortDate(data.createdAt)}</div>
          </div>
        </div>

        {(data.timeWindow || data.scheduledStart) && (
          <div className="mt-5 pt-5 border-t border-panel-subtle flex flex-wrap gap-6 text-sm">
            {data.scheduledStart && (
              <div className="flex items-center gap-2 text-sc-2">
                <CalendarClock className="w-4 h-4 text-sc-blue" /> Scheduled {shortDate(data.scheduledStart)}
              </div>
            )}
            {data.timeWindow && (
              <div className="flex items-center gap-2 text-sc-2">
                <Clock className="w-4 h-4 text-sc-blue" /> {data.timeWindow}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="sc-panel p-5">
          <h2 className="text-[15px] font-semibold text-sc flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-sc-blue" /> Visit History
          </h2>
          {visits.length === 0 ? (
            <div className="text-center py-8 text-sc-3 text-sm" data-testid="empty-portal-visits">No visits recorded yet.</div>
          ) : (
            <div className="space-y-2">
              {visits.map((v, i) => (
                <div
                  key={`${v.date}-${i}`}
                  data-testid={`portal-workorder-visit-${i}`}
                  className="rounded-lg px-4 py-3"
                  style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-sc">{shortDate(v.date)}</span>
                    {v.technicianName && <span className="text-xs text-sc-3">{v.technicianName}</span>}
                  </div>
                  {v.summary && <p className="text-xs text-sc-2 mt-1">{v.summary}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="sc-panel p-5">
          <h2 className="text-[15px] font-semibold text-sc flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-sc-blue" /> Updates
          </h2>
          {updates.length === 0 ? (
            <div className="text-center py-8 text-sc-3 text-sm" data-testid="empty-portal-updates">No updates yet.</div>
          ) : (
            <div className="space-y-2">
              {updates.map((u, i) => (
                <div
                  key={`${u.timestamp}-${i}`}
                  data-testid={`portal-workorder-update-${i}`}
                  className="rounded-lg px-4 py-3"
                  style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}
                >
                  <div className="text-xs text-sc-3">{shortDate(u.timestamp)}</div>
                  <p className="text-sm text-sc-2 mt-1">{u.message}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
