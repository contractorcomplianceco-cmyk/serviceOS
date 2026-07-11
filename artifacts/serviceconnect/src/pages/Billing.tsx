import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { billingClass, money, shortDate } from "@/lib/ui";
import { AlertTriangle, CheckCircle2, ArrowRight, FileText, Send, Link as LinkIcon, DollarSign, Clock, Download, Building2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Invoice } from "@/lib/types";

export default function Billing() {
  const { workOrders, invoices, customers, updateWorkOrder, addInvoice, updateInvoice } = useAppStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const needsReview = workOrders.filter((w) => w.status === "Completed Pending Review" && (w.labor.length > 0 && w.labor.every((l) => l.approved)) && w.materials.every((m) => m.approved));
  const missingInfo = workOrders.filter((w) => w.status === "Completed Pending Review" && (w.labor.length === 0 || w.materials.some((m) => !m.approved) || w.labor.some(l => !l.approved)));
  const readyToBill = workOrders.filter((w) => w.status === "Ready for Billing" || w.billingStatus === "Ready for Invoice");
  const pastDue = invoices.filter((i) => i.status === "Past Due");
  const recentInvoices = invoices.filter((i) => i.status === "Invoiced" || i.status === "Ready for Invoice" || i.status === "Paid");

  const createInvoice = (woId: string) => {
    const wo = workOrders.find((w) => w.id === woId);
    if (!wo) return;
    const laborLines = wo.labor.map((l) => ({ id: `l-${l.id}`, description: `Labor (${l.type}) ${l.hours}hrs`, quantity: l.hours, rate: l.rate }));
    const matLines = wo.materials.map((m) => ({ id: `m-${m.id}`, description: m.name, quantity: m.quantity, rate: m.billablePrice }));
    const lines = [...laborLines, ...matLines];
    const amount = lines.reduce((s, l) => s + l.quantity * l.rate, 0);
    const newInvoice: Invoice = { 
      id: `inv-${Date.now()}`, 
      number: `INV-${5000 + invoices.length + 1}`, 
      workOrderId: wo.id, 
      customerId: wo.customerId, 
      lines, 
      amount, 
      status: "Ready for Invoice", 
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString(), 
      createdAt: new Date().toISOString() 
    };
    addInvoice(newInvoice);
    updateWorkOrder(wo.id, { status: "Invoiced", billingStatus: "Invoiced" });
    toast({ title: "Draft invoice created", description: `${wo.number} → invoice drafted for ${money(amount)}. Review before sending.` });
  };

  const handleSendInvoice = (inv: Invoice) => {
    updateInvoice(inv.id, { status: "Invoiced", issueDate: new Date().toISOString() });
    setSelectedInvoice(null);
    toast({ title: "Invoice Sent", description: `Invoice ${inv.number} has been sent to the customer.` });
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Billing Queue</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Review completed jobs, resolve missing info, and draft invoices. Nothing bills automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white">
            <Download className="w-4 h-4 mr-2" /> Export Queue
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Missing Info" value={missingInfo.length} icon={AlertTriangle} color="text-amber-500" bg="bg-amber-500/10" />
        <StatCard label="Needs Review" value={needsReview.length} icon={Clock} color="text-blue-500" bg="bg-blue-500/10" />
        <StatCard label="Ready to Invoice" value={readyToBill.length} icon={CheckCircle2} color="text-emerald-500" bg="bg-emerald-500/10" />
        <StatCard label="Past Due" value={pastDue.length} icon={DollarSign} color="text-destructive" bg="bg-destructive/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Job Queue */}
        <div className="space-y-6">
          <Card className="border border-slate-200/60 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Missing Information
                </CardTitle>
                <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">{missingInfo.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {missingInfo.length === 0 ? <div className="p-6 text-center text-sm text-slate-500">No jobs missing info.</div> : missingInfo.map((wo) => {
                const c = customers.find((cc) => cc.id === wo.customerId);
                return (
                  <div key={wo.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group" data-testid={`billing-missing-${wo.id}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <button className="font-semibold text-slate-900 hover:text-primary transition-colors text-sm" onClick={() => navigate(`/work-orders/${wo.id}`)}>{wo.number}</button>
                        <span className="text-xs text-slate-500">{c?.name}</span>
                      </div>
                      <div className="text-xs text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Labor/Materials need approval</div>
                    </div>
                    <Button size="sm" variant="outline" className="opacity-0 group-hover:opacity-100" onClick={() => navigate(`/work-orders/${wo.id}`)}>Resolve</Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border border-slate-200/60 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" /> Needs Review
                </CardTitle>
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">{needsReview.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {needsReview.length === 0 ? <div className="p-6 text-center text-sm text-slate-500">No jobs pending review.</div> : needsReview.map((wo) => {
                const c = customers.find((cc) => cc.id === wo.customerId);
                return (
                  <div key={wo.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group" data-testid={`billing-review-${wo.id}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <button className="font-semibold text-slate-900 hover:text-primary transition-colors text-sm" onClick={() => navigate(`/work-orders/${wo.id}`)}>{wo.number}</button>
                        <span className="text-xs text-slate-500">{c?.name}</span>
                      </div>
                      <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ready for final check</div>
                    </div>
                    <Button size="sm" className="bg-primary text-white" onClick={() => navigate(`/work-orders/${wo.id}`)} data-testid={`button-review-${wo.id}`}>Review</Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border border-slate-200/60 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 py-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Ready for Invoice
                </CardTitle>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">{readyToBill.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {readyToBill.length === 0 ? <div className="p-6 text-center text-sm text-slate-500">No jobs ready to invoice.</div> : readyToBill.map((wo) => {
                const c = customers.find((cc) => cc.id === wo.customerId);
                const total = wo.labor.reduce((s, l) => s + l.hours * l.rate, 0) + wo.materials.reduce((s, m) => s + m.quantity * m.billablePrice, 0);
                return (
                  <div key={wo.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group" data-testid={`billing-ready-${wo.id}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <button className="font-semibold text-slate-900 hover:text-primary transition-colors text-sm" onClick={() => navigate(`/work-orders/${wo.id}`)}>{wo.number}</button>
                        <span className="text-xs text-slate-500">{c?.name}</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-1">{money(total)}</div>
                    </div>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => createInvoice(wo.id)} data-testid={`button-create-invoice-${wo.id}`}>
                      Draft Invoice
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Invoice Management */}
        <div className="space-y-6">
          <Card className="border border-slate-200/60 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" /> Invoice Management
                </CardTitle>
                <Badge variant="outline" className="bg-white border-slate-200 text-slate-600">{recentInvoices.length} Recent</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100 h-[calc(100vh-24rem)] overflow-y-auto">
              {recentInvoices.length === 0 ? <div className="p-6 text-center text-sm text-slate-500">No recent invoices.</div> : recentInvoices.map((inv) => {
                const c = customers.find((cc) => cc.id === inv.customerId);
                return (
                  <div key={inv.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">{inv.number}</span>
                        <Badge variant="outline" className={`text-[10px] ${billingClass(inv.status)}`}>{inv.status}</Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{c?.name}</div>
                    </div>
                    <div className="flex items-center gap-4 sm:text-right">
                      <div>
                        <div className="font-bold text-slate-900">{money(inv.amount)}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Due {shortDate(inv.dueDate)}</div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-slate-400 opacity-0 group-hover:opacity-100">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl">
          {selectedInvoice && (() => {
            const customer = customers.find(c => c.id === selectedInvoice.customerId);
            return (
              <>
                <DialogHeader className="border-b pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <DialogTitle className="text-xl">Invoice {selectedInvoice.number}</DialogTitle>
                      <DialogDescription className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className={billingClass(selectedInvoice.status)}>{selectedInvoice.status}</Badge>
                        <span>Created {shortDate(selectedInvoice.createdAt)}</span>
                      </DialogDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{money(selectedInvoice.amount)}</div>
                      <div className="text-sm text-muted-foreground">Due {shortDate(selectedInvoice.dueDate)}</div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="py-4 space-y-6">
                  <div className="flex justify-between p-4 bg-slate-50 rounded-lg border">
                    <div>
                      <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1">Bill To</div>
                      <div className="font-semibold flex items-center gap-2"><Building2 className="w-4 h-4 text-slate-400" /> {customer?.name}</div>
                      <div className="text-sm text-slate-600 mt-1">{customer?.contacts[0]?.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1">From</div>
                      <div className="font-semibold text-slate-900">ServiceConnect App</div>
                      <div className="text-sm text-slate-600 mt-1">billing@serviceconnect.app</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">Line Items</div>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 border-b">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium">Description</th>
                            <th className="px-4 py-2 text-right font-medium">Qty</th>
                            <th className="px-4 py-2 text-right font-medium">Rate</th>
                            <th className="px-4 py-2 text-right font-medium">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {selectedInvoice.lines.map((line, i) => (
                            <tr key={i}>
                              <td className="px-4 py-3">{line.description}</td>
                              <td className="px-4 py-3 text-right">{line.quantity}</td>
                              <td className="px-4 py-3 text-right">{money(line.rate)}</td>
                              <td className="px-4 py-3 text-right font-medium">{money(line.quantity * line.rate)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t">
                          <tr>
                            <td colSpan={3} className="px-4 py-3 text-right font-semibold">Total</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900">{money(selectedInvoice.amount)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                <DialogFooter className="border-t pt-4 sm:justify-between">
                  <Button variant="outline" onClick={() => setSelectedInvoice(null)}>Close</Button>
                  <div className="flex gap-2">
                    <Button variant="secondary" className="bg-slate-100 text-slate-900 hover:bg-slate-200">
                      <LinkIcon className="w-4 h-4 mr-2" /> Copy Link
                    </Button>
                    <Button onClick={() => handleSendInvoice(selectedInvoice)} disabled={selectedInvoice.status !== "Ready for Invoice"}>
                      <Send className="w-4 h-4 mr-2" /> Send Invoice
                    </Button>
                  </div>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, bg }: { label: string; value: number; icon: any; color: string; bg: string }) {
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
