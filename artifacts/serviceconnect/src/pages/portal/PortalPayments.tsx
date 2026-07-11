import { Loader2, AlertCircle, CreditCard } from "lucide-react";
import { useListPortalPayments } from "@workspace/api-client-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { money, shortDate } from "@/lib/ui";

export default function PortalPayments() {
  const { data, isLoading, isError } = useListPortalPayments();

  return (
    <div className="px-6 py-6 space-y-5 animate-in fade-in duration-500">
      <div>
        <h1 className="text-[28px] leading-none font-bold tracking-tight text-sc" data-testid="text-portal-page-title">
          Payments
        </h1>
        <p className="text-sc-2 mt-2 text-sm">A read-only history of payments on your account.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24" data-testid="loading-portal-payments">
          <Loader2 className="w-8 h-8 animate-spin text-sc-blue" />
        </div>
      ) : isError ? (
        <div className="px-6 py-16 text-center" data-testid="error-portal-payments">
          <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
          <p className="text-sc-2 mt-3">We couldn't load your payments.</p>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="sc-panel p-12 text-center" data-testid="empty-portal-payments">
          <CreditCard className="w-10 h-10 mx-auto text-sc-3" />
          <p className="text-sc-2 mt-3 font-medium">No payments yet</p>
          <p className="text-sc-3 text-sm mt-1">Recorded payments will appear here.</p>
        </div>
      ) : (
        <div className="sc-panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p.id} data-testid={`row-portal-payment-${p.id}`}>
                  <TableCell className="text-sc-2">{shortDate(p.date)}</TableCell>
                  <TableCell className="text-sc-2">{p.method}</TableCell>
                  <TableCell className="text-sc-2">{p.type}</TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">{money(p.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
