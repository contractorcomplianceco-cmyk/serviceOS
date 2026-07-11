import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { billingClass, money, shortDate, relativeDay } from "@/lib/ui";
import { TrendingUp, AlertTriangle, DollarSign, FileCheck, ArrowUpRight, BarChart3, PieChart, Send, CreditCard } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { Invoice, PaymentType } from "@/lib/types";

export default function Accounting() {
  const { invoices, customers, recordPayment } = useAppStore();
  const { toast } = useToast();

  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [payType, setPayType] = useState<PaymentType>("Payment");
  const [payMethod, setPayMethod] = useState<string>("ACH");
  const [payAmount, setPayAmount] = useState<string>("");

  const openPayment = (inv: Invoice) => {
    const remaining = inv.amount - (inv.amountPaid ?? 0);
    setPayInvoice(inv);
    setPayType("Payment");
    setPayMethod("ACH");
    setPayAmount(remaining > 0 ? String(remaining) : "");
  };

  const submitPayment = () => {
    if (!payInvoice) return;
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) {
      toast({ title: "Enter an amount", description: "Payment amount must be greater than zero." });
      return;
    }
    recordPayment(payInvoice.id, amt, payType, payMethod);
    toast({ title: `${payType} recorded`, description: `${money(amt)} applied to ${payInvoice.number} via ${payMethod}.` });
    setPayInvoice(null);
  };

  const paymentTypes: PaymentType[] = ["Payment", "Partial Payment", "Credit", "Refund"];
  const methods = ["ACH", "Check", "Credit Card", "Wire", "Cash", "Manual"];

  const pastDue = invoices.filter((i) => i.status === "Past Due");
  const outstanding = invoices.filter((i) => i.status !== "Paid").reduce((s, i) => s + i.amount, 0);
  const paidThisMonth = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
  const arTotal = pastDue.reduce((s, i) => s + i.amount, 0);

  const agingBuckets = [
    { label: "0–30 days", value: invoices.filter((i) => i.status !== "Paid" && daysOut(i.dueDate) <= 30).reduce((s, i) => s + i.amount, 0), color: "#43a6ff" },
    { label: "31–60 days", value: invoices.filter((i) => i.status !== "Paid" && daysOut(i.dueDate) > 30 && daysOut(i.dueDate) <= 60).reduce((s, i) => s + i.amount, 0), color: "#ff9d18" },
    { label: "60+ days", value: invoices.filter((i) => i.status !== "Paid" && daysOut(i.dueDate) > 60).reduce((s, i) => s + i.amount, 0), color: "#ff3348" },
  ];

  const revenueByCustomer = customers.map(c => {
    const custInvoices = invoices.filter(i => i.customerId === c.id && i.status === "Paid");
    return {
      name: c.name,
      revenue: custInvoices.reduce((s, i) => s + i.amount, 0)
    };
  }).filter(c => c.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">Accounting & AR</h1>
          <p className="text-sc-2 mt-1 text-sm">
            Accounts receivable, invoice status, and aging. Built for operational oversight.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-sc-2 hover:text-white" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}}>
            <BarChart3 className="w-4 h-4 mr-2" /> Export Reports
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Outstanding AR" value={money(outstanding)} icon={DollarSign} color="text-sc-blue" bg="bg-[rgba(67,166,255,0.1)]" />
        <MetricCard label="Past Due" value={money(arTotal)} icon={AlertTriangle} color="text-destructive" bg="bg-[rgba(255,51,72,0.1)]" />
        <MetricCard label="Collected (Month)" value={money(paidThisMonth)} icon={TrendingUp} color="text-[color:var(--sc-green)]" bg="bg-[rgba(56,212,119,0.1)]" />
        <MetricCard label="Open Invoices" value={String(invoices.filter((i) => i.status !== "Paid").length)} icon={FileCheck} color="text-sc-3" bg="bg-[var(--sc-elevated)] border border-[color:var(--sc-line)]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="sc-panel overflow-hidden border-0">
            <CardHeader className="border-b border-panel py-4 px-5" style={{ background: "var(--sc-inner)" }}>
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-sc">
                <PieChart className="w-4 h-4 text-sc-3" /> AR Aging
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingBuckets} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(127,164,196,0.14)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#75869c', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#75869c', fontSize: 12 }} tickFormatter={(val) => `$${val / 1000}k`} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ background: '#0a1b2c', border: '1px solid rgba(127,164,196,0.28)', borderRadius: 8, color: '#f5f8fc' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="sc-panel border border-[color:var(--sc-line)] shadow-lg rounded-lg text-sm p-3">
                            <div className="font-semibold text-sc">{payload[0].payload.label}</div>
                            <div className="text-sc-blue mt-1">{money(payload[0].value as number)}</div>
                          </div>
                        );
                      }
                      return null;
                    }} 
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {agingBuckets.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="sc-panel overflow-hidden border-0">
            <CardHeader className="border-b border-panel py-4 px-5" style={{ background: "var(--sc-inner)" }}>
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-sc">
                <TrendingUp className="w-4 h-4 text-[color:var(--sc-green)]" /> Top Customers by Paid Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-[color:var(--sc-line-subtle)]">
               {revenueByCustomer.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-4">
                    <div className="font-medium text-sc">{c.name}</div>
                    <div className="font-bold text-sc">{money(c.revenue)}</div>
                  </div>
               ))}
               {revenueByCustomer.length === 0 && <div className="p-6 text-center text-sm text-sc-3">No revenue data available.</div>}
            </CardContent>
          </Card>
        </div>

        {/* Action Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="sc-panel border border-destructive/20 overflow-hidden shadow-none">
            <CardHeader className="bg-[rgba(255,51,72,0.05)] border-b border-destructive/20 py-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Collections Focus
                </CardTitle>
                <Badge variant="outline" className="bg-transparent text-destructive border-destructive/30">{pastDue.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-[color:var(--sc-line-subtle)] max-h-[500px] overflow-y-auto scrollbar-thin">
              {pastDue.length === 0 ? <div className="p-6 text-center text-sm text-sc-3">No past due invoices.</div> : pastDue.map((inv) => {
                const c = customers.find((cc) => cc.id === inv.customerId);
                const paid = inv.amountPaid ?? 0;
                const remaining = inv.amount - paid;
                return (
                  <div key={inv.id} className="p-4 hover:bg-white/[0.04] transition-colors" data-testid={`ar-${inv.id}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-sc text-sm">{inv.number}</div>
                        <div className="text-xs text-sc-3">{c?.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-destructive">{money(remaining)}</div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-destructive/70 mt-1">{relativeDay(inv.dueDate)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-sc-3 mb-3">
                      <span>Invoice {money(inv.amount)}</span>
                      <span>Paid {money(paid)}</span>
                      <span className="font-semibold text-sc-2">Balance {money(remaining)}</span>
                    </div>
                    {(inv.payments && inv.payments.length > 0) && (
                      <div className="mb-3 rounded-md p-2 space-y-1" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid={`payments-${inv.id}`}>
                        {inv.payments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between text-[11px] text-sc-2">
                            <span className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[9px] px-1 py-0 text-sc-2 border-panel bg-transparent">{p.type}</Badge>
                              {p.method}
                            </span>
                            <span className="text-sc-3">{shortDate(p.date)}</span>
                            <span className={p.type === "Refund" ? "font-semibold text-destructive" : "font-semibold text-[color:var(--sc-green)]"}>
                              {p.type === "Refund" ? "-" : ""}{money(p.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-8 text-sc-2 hover:text-white" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} onClick={() => toast({ title: "Reminder drafted", description: `Payment reminder drafted for ${c?.name}. Review before sending.` })} data-testid={`button-remind-${inv.id}`}>
                        <Send className="w-3 h-3 mr-1" /> Draft Reminder
                      </Button>
                      <Button size="sm" className="flex-1 text-xs h-8 text-white blue-glow-soft" style={{background:'var(--sc-btn)',border:'1px solid var(--sc-btn-highlight)'}} onClick={() => openPayment(inv)} data-testid={`button-record-payment-${inv.id}`}>
                        <CreditCard className="w-3 h-3 mr-1" /> Record Payment
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

      </div>

      <Dialog open={!!payInvoice} onOpenChange={(open) => !open && setPayInvoice(null)}>
        <DialogContent className="max-w-md bg-card border-panel text-sc">
          {payInvoice && (() => {
            const c = customers.find((cc) => cc.id === payInvoice.customerId);
            const paid = payInvoice.amountPaid ?? 0;
            const remaining = payInvoice.amount - paid;
            return (
              <>
                <DialogHeader className="border-b border-panel pb-4">
                  <DialogTitle className="text-lg text-sc flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-sc-blue" /> Record Payment — {payInvoice.number}
                  </DialogTitle>
                  <DialogDescription className="text-sc-3">{c?.name}</DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg p-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}}>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-sc-3">Invoice</div>
                      <div className="font-bold text-sc mt-1">{money(payInvoice.amount)}</div>
                    </div>
                    <div className="rounded-lg p-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}}>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-sc-3">Paid</div>
                      <div className="font-bold text-[color:var(--sc-green)] mt-1">{money(paid)}</div>
                    </div>
                    <div className="rounded-lg p-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}}>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-sc-3">Balance</div>
                      <div className="font-bold text-sc mt-1">{money(remaining)}</div>
                    </div>
                  </div>

                  {(payInvoice.payments && payInvoice.payments.length > 0) && (
                    <div className="rounded-lg p-3 space-y-1.5" style={{background:'var(--sc-inner)',border:'1px solid var(--sc-line)'}}>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-sc-3 mb-1">Recorded Payments</div>
                      {payInvoice.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs text-sc-2">
                          <span className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-sc-2 border-panel bg-transparent">{p.type}</Badge>
                            {p.method} · {shortDate(p.date)}
                          </span>
                          <span className={p.type === "Refund" ? "font-semibold text-destructive" : "font-semibold text-[color:var(--sc-green)]"}>
                            {p.type === "Refund" ? "-" : ""}{money(p.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-sc-2">Payment Type</Label>
                    <Select value={payType} onValueChange={(v) => setPayType(v as PaymentType)}>
                      <SelectTrigger className="text-sc" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="select-payment-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{background:'var(--sc-panel)',border:'1px solid var(--sc-line)'}}>
                        {paymentTypes.map((t) => <SelectItem key={t} value={t} className="text-sc">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-sc-2">Amount</Label>
                      <Input type="number" min="0" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" className="text-sc placeholder:text-sc-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="input-payment-amount" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-sc-2">Method</Label>
                      <Select value={payMethod} onValueChange={setPayMethod}>
                        <SelectTrigger className="text-sc" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="select-payment-method">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent style={{background:'var(--sc-panel)',border:'1px solid var(--sc-line)'}}>
                          {methods.map((m) => <SelectItem key={m} value={m} className="text-sc">{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <DialogFooter className="border-t border-panel pt-4 sm:justify-between">
                  <Button variant="outline" className="text-sc-2 hover:text-white border-panel hover:bg-white/[0.05]" onClick={() => setPayInvoice(null)} data-testid="button-cancel-payment">Cancel</Button>
                  <Button className="text-white blue-glow-soft" style={{background:'var(--sc-btn)',border:'1px solid var(--sc-btn-highlight)'}} onClick={submitPayment} data-testid="button-submit-payment">
                    <CreditCard className="w-4 h-4 mr-2" /> Record {payType}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function daysOut(dueDate: string): number {
  return Math.round((Date.now() - new Date(dueDate).getTime()) / 86400000);
}

function MetricCard({ label, value, icon: Icon, color, bg }: { label: string; value: string; icon: any; color: string; bg: string }) {
  return (
    <Card className="sc-panel border-0">
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-sc-2 mb-1">{label}</p>
          <p className="text-3xl font-bold text-sc">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
}
