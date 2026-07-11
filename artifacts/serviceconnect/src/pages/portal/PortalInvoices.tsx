import { Loader2, AlertCircle, Receipt } from "lucide-react";
import { useListPortalInvoices } from "@workspace/api-client-react";
import { money, shortDate, billingClass } from "@/lib/ui";
import type { BillingStatus } from "@/lib/types";

export default function PortalInvoices() {
  const { data, isLoading, isError } = useListPortalInvoices();

  return (
    <div className="px-6 py-6 space-y-5 animate-in fade-in duration-500">
      <div>
        <h1 className="text-[28px] leading-none font-bold tracking-tight text-sc" data-testid="text-portal-page-title">
          Invoices
        </h1>
        <p className="text-sc-2 mt-2 text-sm">Your billing history and outstanding balances.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24" data-testid="loading-portal-invoices">
          <Loader2 className="w-8 h-8 animate-spin text-sc-blue" />
        </div>
      ) : isError ? (
        <div className="px-6 py-16 text-center" data-testid="error-portal-invoices">
          <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
          <p className="text-sc-2 mt-3">We couldn't load your invoices.</p>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="sc-panel p-12 text-center" data-testid="empty-portal-invoices">
          <Receipt className="w-10 h-10 mx-auto text-sc-3" />
          <p className="text-sc-2 mt-3 font-medium">No invoices yet</p>
          <p className="text-sc-3 text-sm mt-1">Invoices will appear here once billed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((inv) => {
            const balance = inv.amount - inv.amountPaid;
            return (
              <div key={inv.id} data-testid={`card-portal-invoice-${inv.id}`} className="sc-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-sc">{inv.number}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-md border ${billingClass(inv.status as BillingStatus)}`}>{inv.status}</span>
                    </div>
                    <div className="text-[11px] text-sc-3 mt-1">Due {shortDate(inv.dueDate)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-sc">{money(inv.amount)}</div>
                    <div className="text-[11px] text-sc-3 mt-0.5">
                      Paid {money(inv.amountPaid)} · Balance {money(balance)}
                    </div>
                  </div>
                </div>

                {inv.lines.length > 0 && (
                  <div className="mt-4 rounded-lg overflow-hidden" style={{ border: "1px solid var(--sc-line)" }}>
                    {inv.lines.map((line, i) => (
                      <div
                        key={line.id}
                        className="flex items-center justify-between px-4 py-2.5 text-sm"
                        style={{ background: i % 2 === 0 ? "var(--sc-elevated)" : "transparent" }}
                      >
                        <span className="text-sc-2">{line.description}</span>
                        <span className="text-sc font-medium">{line.quantity} × {money(line.rate)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
