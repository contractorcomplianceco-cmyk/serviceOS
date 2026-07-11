import { Link } from "wouter";
import { Loader2, ClipboardList, AlertCircle, ArrowRight } from "lucide-react";
import { useListPortalWorkOrders } from "@workspace/api-client-react";
import { shortDate, statusClass, priorityClass } from "@/lib/ui";
import type { WorkOrderStatus, Priority } from "@/lib/types";

export default function PortalWorkOrders() {
  const { data, isLoading, isError } = useListPortalWorkOrders();

  return (
    <div className="px-6 py-6 space-y-5 animate-in fade-in duration-500">
      <div>
        <h1 className="text-[28px] leading-none font-bold tracking-tight text-sc" data-testid="text-portal-page-title">
          Work Orders
        </h1>
        <p className="text-sc-2 mt-2 text-sm">All service work associated with your account.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24" data-testid="loading-portal-workorders">
          <Loader2 className="w-8 h-8 animate-spin text-sc-blue" />
        </div>
      ) : isError ? (
        <div className="px-6 py-16 text-center" data-testid="error-portal-workorders">
          <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
          <p className="text-sc-2 mt-3">We couldn't load your work orders.</p>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="sc-panel p-12 text-center" data-testid="empty-portal-workorders">
          <ClipboardList className="w-10 h-10 mx-auto text-sc-3" />
          <p className="text-sc-2 mt-3 font-medium">No work orders yet</p>
          <p className="text-sc-3 text-sm mt-1">Service work will appear here once it's created.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((wo) => (
            <Link key={wo.id} href={`/portal/work-orders/${wo.id}`}>
              <div
                data-testid={`card-portal-workorder-${wo.id}`}
                className="sc-panel p-5 h-full transition-all hover:-translate-y-0.5 hover:border-[var(--sc-blue)] cursor-pointer flex flex-col"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-sc">{wo.number}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-md border ${statusClass(wo.status as WorkOrderStatus)}`}>{wo.status}</span>
                </div>
                <p className="text-sm text-sc-2 mt-2 line-clamp-2 flex-1">{wo.description}</p>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityClass(wo.priority as Priority)}`}>{wo.priority}</span>
                    <span className="text-[11px] text-sc-3">{wo.type}</span>
                  </div>
                  <span className="text-[11px] text-sc-3">Due {shortDate(wo.dueDate)}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-panel-subtle flex items-center justify-end">
                  <span className="text-xs text-sc-blue flex items-center gap-1">
                    View details <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
