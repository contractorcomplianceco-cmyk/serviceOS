import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { billingClass, money, shortDate, relativeDay } from "@/lib/ui";
import { TrendingUp, AlertTriangle, DollarSign, FileCheck, ArrowUpRight, BarChart3, PieChart, Send, CreditCard } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

export default function Accounting() {
  const { invoices, customers, updateInvoice } = useAppStore();
  const { toast } = useToast();

  const pastDue = invoices.filter((i) => i.status === "Past Due");
  const outstanding = invoices.filter((i) => i.status !== "Paid").reduce((s, i) => s + i.amount, 0);
  const paidThisMonth = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
  const arTotal = pastDue.reduce((s, i) => s + i.amount, 0);

  const agingBuckets = [
    { label: "0–30 days", value: invoices.filter((i) => i.status !== "Paid" && daysOut(i.dueDate) <= 30).reduce((s, i) => s + i.amount, 0), color: "#3b82f6" },
    { label: "31–60 days", value: invoices.filter((i) => i.status !== "Paid" && daysOut(i.dueDate) > 30 && daysOut(i.dueDate) <= 60).reduce((s, i) => s + i.amount, 0), color: "#f59e0b" },
    { label: "60+ days", value: invoices.filter((i) => i.status !== "Paid" && daysOut(i.dueDate) > 60).reduce((s, i) => s + i.amount, 0), color: "#ef4444" },
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Accounting & AR</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Accounts receivable, invoice status, and aging. Built for operational oversight.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white">
            <BarChart3 className="w-4 h-4 mr-2" /> Export Reports
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Outstanding AR" value={money(outstanding)} icon={DollarSign} color="text-blue-500" bg="bg-blue-500/10" />
        <MetricCard label="Past Due" value={money(arTotal)} icon={AlertTriangle} color="text-destructive" bg="bg-destructive/10" />
        <MetricCard label="Collected (Month)" value={money(paidThisMonth)} icon={TrendingUp} color="text-emerald-500" bg="bg-emerald-500/10" />
        <MetricCard label="Open Invoices" value={String(invoices.filter((i) => i.status !== "Paid").length)} icon={FileCheck} color="text-slate-500" bg="bg-slate-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-slate-200/60 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-5">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <PieChart className="w-4 h-4 text-slate-500" /> AR Aging
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingBuckets} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `$${val / 1000}k`} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border shadow-lg rounded-lg text-sm">
                            <div className="font-semibold text-slate-900">{payload[0].payload.label}</div>
                            <div className="text-primary mt-1">{money(payload[0].value as number)}</div>
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

          <Card className="border border-slate-200/60 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-5">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Top Customers by Paid Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
               {revenueByCustomer.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-4">
                    <div className="font-medium text-slate-900">{c.name}</div>
                    <div className="font-bold">{money(c.revenue)}</div>
                  </div>
               ))}
               {revenueByCustomer.length === 0 && <div className="p-6 text-center text-sm text-slate-500">No revenue data available.</div>}
            </CardContent>
          </Card>
        </div>

        {/* Action Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-destructive/20 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-destructive/5 border-b border-destructive/10 py-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Collections Focus
                </CardTitle>
                <Badge variant="outline" className="bg-white text-destructive border-destructive/20">{pastDue.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {pastDue.length === 0 ? <div className="p-6 text-center text-sm text-slate-500">No past due invoices.</div> : pastDue.map((inv) => {
                const c = customers.find((cc) => cc.id === inv.customerId);
                return (
                  <div key={inv.id} className="p-4 hover:bg-slate-50 transition-colors" data-testid={`ar-${inv.id}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{inv.number}</div>
                        <div className="text-xs text-slate-500">{c?.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-destructive">{money(inv.amount)}</div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-destructive/70 mt-1">{relativeDay(inv.dueDate)}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => toast({ title: "Reminder drafted", description: `Payment reminder drafted for ${c?.name}. Review before sending.` })} data-testid={`button-remind-${inv.id}`}>
                        <Send className="w-3 h-3 mr-1" /> Draft Reminder
                      </Button>
                      <Button size="sm" className="flex-1 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { updateInvoice(inv.id, { status: "Paid", paidDate: new Date().toISOString() }); toast({ title: "Marked paid", description: `${inv.number} recorded as paid.` }); }} data-testid={`button-mark-paid-${inv.id}`}>
                        <CreditCard className="w-3 h-3 mr-1" /> Mark Paid
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

function daysOut(dueDate: string): number {
  return Math.round((Date.now() - new Date(dueDate).getTime()) / 86400000);
}

function MetricCard({ label, value, icon: Icon, color, bg }: { label: string; value: string; icon: any; color: string; bg: string }) {
  return (
    <Card className="border border-slate-200/60 shadow-sm bg-white">
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
}
