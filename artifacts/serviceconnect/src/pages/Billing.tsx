import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { billingClass, money, shortDate } from "@/lib/ui";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

export default function Billing() {
  const { workOrders, invoices, customers, updateWorkOrder, addInvoice } = useAppStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const needsReview = workOrders.filter((w) => w.status === "Completed Pending Review");
  const readyToBill = workOrders.filter((w) => w.status === "Ready for Billing" || w.billingStatus === "Ready for Invoice");
  const missingInfo = workOrders.filter((w) => w.status === "Completed Pending Review" && (w.labor.length === 0 || w.materials.some((m) => !m.approved)));

  const createInvoice = (woId: string) => {
    const wo = workOrders.find((w) => w.id === woId);
    if (!wo) return;
    const laborLines = wo.labor.map((l) => ({ id: `l-${l.id}`, description: `Labor (${l.type}) ${l.hours}hrs`, quantity: l.hours, rate: l.rate }));
    const matLines = wo.materials.map((m) => ({ id: `m-${m.id}`, description: m.name, quantity: m.quantity, rate: m.billablePrice }));
    const lines = [...laborLines, ...matLines];
    const amount = lines.reduce((s, l) => s + l.quantity * l.rate, 0);
    addInvoice({ id: `inv-${Date.now()}`, number: `INV-${5000 + invoices.length + 1}`, workOrderId: wo.id, customerId: wo.customerId, lines, amount, status: "Ready for Invoice", dueDate: new Date(Date.now() + 30 * 86400000).toISOString(), createdAt: new Date().toISOString() });
    updateWorkOrder(wo.id, { status: "Invoiced", billingStatus: "Invoiced" });
    toast({ title: "Draft invoice created", description: `${wo.number} → invoice drafted for ${money(amount)}. Review before sending to the customer.` });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Billing Queue</h1>
        <p className="text-muted-foreground">Review completed jobs, resolve missing info, and draft invoices. Nothing bills automatically.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Needs Review" value={needsReview.length} accent="border-l-blue-500" />
        <StatCard label="Missing Info" value={missingInfo.length} accent="border-l-amber-500" />
        <StatCard label="Ready to Invoice" value={readyToBill.length} accent="border-l-emerald-500" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Completed — Pending Billing Review</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {needsReview.length === 0 ? <p className="text-sm text-muted-foreground">No jobs pending review.</p> : needsReview.map((wo) => {
            const c = customers.find((cc) => cc.id === wo.customerId);
            const laborOk = wo.labor.length > 0 && wo.labor.every((l) => l.approved);
            const matOk = wo.materials.every((m) => m.approved);
            const ready = laborOk && matOk;
            return (
              <div key={wo.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`billing-review-${wo.id}`}>
                <div>
                  <button className="font-semibold text-primary hover:underline" onClick={() => navigate(`/work-orders/${wo.id}`)}>{wo.number}</button>
                  <span className="text-sm text-muted-foreground ml-2">{c?.name}</span>
                  <div className="text-xs mt-1">{ready ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Labor & materials approved</span> : <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Needs approval before billing</span>}</div>
                </div>
                <Button size="sm" variant={ready ? "default" : "outline"} className={ready ? "bg-primary text-white" : ""} onClick={() => navigate(`/work-orders/${wo.id}`)} data-testid={`button-review-${wo.id}`}>Review <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Ready to Invoice</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {readyToBill.length === 0 ? <p className="text-sm text-muted-foreground">No jobs ready to invoice.</p> : readyToBill.map((wo) => {
            const c = customers.find((cc) => cc.id === wo.customerId);
            const total = wo.labor.reduce((s, l) => s + l.hours * l.rate, 0) + wo.materials.reduce((s, m) => s + m.quantity * m.billablePrice, 0);
            return (
              <div key={wo.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`billing-ready-${wo.id}`}>
                <div>
                  <button className="font-semibold text-primary hover:underline" onClick={() => navigate(`/work-orders/${wo.id}`)}>{wo.number}</button>
                  <span className="text-sm text-muted-foreground ml-2">{c?.name}</span>
                  <div className="text-sm font-medium mt-1">{money(total)}</div>
                </div>
                <Button size="sm" className="bg-primary text-white" onClick={() => createInvoice(wo.id)} data-testid={`button-create-invoice-${wo.id}`}>Create Draft Invoice</Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Invoices</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {invoices.slice(0, 6).map((inv) => {
            const c = customers.find((cc) => cc.id === inv.customerId);
            return (
              <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                <div><span className="font-medium">{inv.number}</span> <span className="text-muted-foreground ml-2">{c?.name}</span></div>
                <div className="flex items-center gap-3"><span className="text-muted-foreground">Due {shortDate(inv.dueDate)}</span><span className="font-semibold">{money(inv.amount)}</span><Badge variant="outline" className={billingClass(inv.status)}>{inv.status}</Badge></div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <Card className={`border-l-4 ${accent}`}>
      <CardContent className="p-4"><div className="text-sm text-muted-foreground">{label}</div><div className="text-3xl font-bold text-slate-900 mt-1">{value}</div></CardContent>
    </Card>
  );
}
