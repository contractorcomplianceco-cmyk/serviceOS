import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { billingClass, money, shortDate, relativeDay } from "@/lib/ui";
import { TrendingUp, AlertTriangle, DollarSign, FileCheck } from "lucide-react";

export default function Accounting() {
  const { invoices, customers, updateInvoice } = useAppStore();
  const { toast } = useToast();

  const pastDue = invoices.filter((i) => i.status === "Past Due");
  const outstanding = invoices.filter((i) => i.status !== "Paid").reduce((s, i) => s + i.amount, 0);
  const paidThisMonth = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
  const arTotal = pastDue.reduce((s, i) => s + i.amount, 0);

  const agingBuckets = [
    { label: "0–30 days", items: invoices.filter((i) => i.status !== "Paid" && daysOut(i.dueDate) <= 30) },
    { label: "31–60 days", items: invoices.filter((i) => i.status !== "Paid" && daysOut(i.dueDate) > 30 && daysOut(i.dueDate) <= 60) },
    { label: "60+ days", items: invoices.filter((i) => i.status !== "Paid" && daysOut(i.dueDate) > 60) },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Accounting & AR</h1>
        <p className="text-muted-foreground">Accounts receivable, invoice status, and aging. Replaces the QuickBooks handoff.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Outstanding AR" value={money(outstanding)} icon={DollarSign} accent="border-l-blue-500" iconColor="text-blue-600" />
        <MetricCard label="Past Due" value={money(arTotal)} icon={AlertTriangle} accent="border-l-destructive" iconColor="text-destructive" />
        <MetricCard label="Collected (Month)" value={money(paidThisMonth)} icon={TrendingUp} accent="border-l-emerald-500" iconColor="text-emerald-600" />
        <MetricCard label="Open Invoices" value={String(invoices.filter((i) => i.status !== "Paid").length)} icon={FileCheck} accent="border-l-slate-300" iconColor="text-slate-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {agingBuckets.map((b) => (
          <Card key={b.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{b.label}</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{money(b.items.reduce((s, i) => s + i.amount, 0))}</div>
              <div className="text-xs text-muted-foreground">{b.items.length} invoice{b.items.length !== 1 ? "s" : ""}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" /> Past Due — Collections Focus</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {pastDue.length === 0 ? <p className="text-sm text-muted-foreground">No past due invoices.</p> : pastDue.map((inv) => {
            const c = customers.find((cc) => cc.id === inv.customerId);
            return (
              <div key={inv.id} className="flex items-center justify-between p-3 border border-destructive/20 bg-destructive/5 rounded-lg" data-testid={`ar-${inv.id}`}>
                <div>
                  <div className="font-medium">{inv.number} · {c?.name}</div>
                  <div className="text-xs text-destructive">Due {shortDate(inv.dueDate)} · {relativeDay(inv.dueDate)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{money(inv.amount)}</span>
                  <Button size="sm" variant="outline" onClick={() => toast({ title: "Reminder drafted", description: `Payment reminder drafted for ${c?.name}. Review before sending.` })} data-testid={`button-remind-${inv.id}`}>Draft Reminder</Button>
                  <Button size="sm" className="bg-primary text-white" onClick={() => { updateInvoice(inv.id, { status: "Paid", paidDate: new Date().toISOString() }); toast({ title: "Marked paid", description: `${inv.number} recorded as paid.` }); }} data-testid={`button-mark-paid-${inv.id}`}>Mark Paid</Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">All Invoices</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {invoices.map((inv) => {
            const c = customers.find((cc) => cc.id === inv.customerId);
            return (
              <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                <div><span className="font-medium">{inv.number}</span> <span className="text-muted-foreground ml-2">{c?.name}</span></div>
                <div className="flex items-center gap-3"><span className="text-muted-foreground">Issued {shortDate(inv.issueDate)}</span><span className="font-semibold">{money(inv.amount)}</span><Badge variant="outline" className={billingClass(inv.status)}>{inv.status}</Badge></div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function daysOut(dueDate: string): number {
  return Math.round((Date.now() - new Date(dueDate).getTime()) / 86400000);
}

function MetricCard({ label, value, icon: Icon, accent, iconColor }: { label: string; value: string; icon: typeof DollarSign; accent: string; iconColor: string }) {
  return (
    <Card className={`border-l-4 ${accent}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0"><CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle><Icon className={`w-4 h-4 ${iconColor}`} /></CardHeader>
      <CardContent><div className="text-2xl font-bold text-slate-900">{value}</div></CardContent>
    </Card>
  );
}
