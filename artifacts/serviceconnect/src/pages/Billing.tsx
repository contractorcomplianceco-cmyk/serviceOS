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
          <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">Billing Queue</h1>
          <p className="text-sc-2 mt-1 text-sm">
            Review completed jobs, resolve missing info, and draft invoices. Nothing bills automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-sc-2 hover:text-white" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}}>
            <Download className="w-4 h-4 mr-2" /> Export Queue
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Missing Info" value={missingInfo.length} icon={AlertTriangle} color="text-[color:var(--sc-orange)]" bg="bg-[rgba(255,157,24,0.1)]" />
        <StatCard label="Needs Review" value={needsReview.length} icon={Clock} color="text-sc-blue" bg="bg-[rgba(67,166,255,0.1)]" />
        <StatCard label="Ready to Invoice" value={readyToBill.length} icon={CheckCircle2} color="text-[color:var(--sc-green)]" bg="bg-[rgba(56,212,119,0.1)]" />
        <StatCard label="Past Due" value={pastDue.length} icon={DollarSign} color="text-destructive" bg="bg-[rgba(255,51,72,0.1)]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Job Queue */}
        <div className="space-y-6">
          <Card className="sc-panel overflow-hidden border-0">
            <CardHeader className="border-b border-panel py-4 px-5" style={{ background: "var(--sc-inner)" }}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-sc flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[color:var(--sc-orange)]" /> Missing Information
                </CardTitle>
                <Badge variant="outline" className="text-[color:var(--sc-orange)] border-[color:var(--sc-orange)] bg-[rgba(255,157,24,0.1)]">{missingInfo.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-[color:var(--sc-line-subtle)]">
              {missingInfo.length === 0 ? <div className="p-6 text-center text-sm text-sc-3">No jobs missing info.</div> : missingInfo.map((wo) => {
                const c = customers.find((cc) => cc.id === wo.customerId);
                return (
                  <div key={wo.id} className="p-4 hover:bg-white/[0.04] transition-colors flex items-center justify-between group" data-testid={`billing-missing-${wo.id}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <button className="font-semibold text-sc hover:text-sc-blue transition-colors text-sm" onClick={() => navigate(`/work-orders/${wo.id}`)}>{wo.number}</button>
                        <span className="text-xs text-sc-3">{c?.name}</span>
                      </div>
                      <div className="text-xs text-[color:var(--sc-orange)] mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Labor/Materials need approval</div>
                    </div>
                    <Button size="sm" variant="outline" className="opacity-0 group-hover:opacity-100 text-sc-2 hover:text-white" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} onClick={() => navigate(`/work-orders/${wo.id}`)}>Resolve</Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="sc-panel overflow-hidden border-0">
            <CardHeader className="border-b border-panel py-4 px-5" style={{ background: "var(--sc-inner)" }}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-sc flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sc-blue" /> Needs Review
                </CardTitle>
                <Badge variant="outline" className="text-sc-blue border-sc-blue bg-[rgba(67,166,255,0.1)]">{needsReview.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-[color:var(--sc-line-subtle)]">
              {needsReview.length === 0 ? <div className="p-6 text-center text-sm text-sc-3">No jobs pending review.</div> : needsReview.map((wo) => {
                const c = customers.find((cc) => cc.id === wo.customerId);
                return (
                  <div key={wo.id} className="p-4 hover:bg-white/[0.04] transition-colors flex items-center justify-between group" data-testid={`billing-review-${wo.id}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <button className="font-semibold text-sc hover:text-sc-blue transition-colors text-sm" onClick={() => navigate(`/work-orders/${wo.id}`)}>{wo.number}</button>
                        <span className="text-xs text-sc-3">{c?.name}</span>
                      </div>
                      <div className="text-xs text-sc-blue mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Ready for final check</div>
                    </div>
                    <Button size="sm" className="text-white blue-glow-soft" style={{background:'var(--sc-btn)',border:'1px solid var(--sc-btn-highlight)'}} onClick={() => navigate(`/work-orders/${wo.id}`)} data-testid={`button-review-${wo.id}`}>Review</Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="sc-panel overflow-hidden border-0">
            <CardHeader className="border-b border-panel py-4 px-5" style={{ background: "var(--sc-inner)" }}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-sc flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[color:var(--sc-green)]" /> Ready for Invoice
                </CardTitle>
                <Badge variant="outline" className="text-[color:var(--sc-green)] border-[color:var(--sc-green)] bg-[rgba(56,212,119,0.1)]">{readyToBill.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-[color:var(--sc-line-subtle)]">
              {readyToBill.length === 0 ? <div className="p-6 text-center text-sm text-sc-3">No jobs ready to invoice.</div> : readyToBill.map((wo) => {
                const c = customers.find((cc) => cc.id === wo.customerId);
                const total = wo.labor.reduce((s, l) => s + l.hours * l.rate, 0) + wo.materials.reduce((s, m) => s + m.quantity * m.billablePrice, 0);
                return (
                  <div key={wo.id} className="p-4 hover:bg-white/[0.04] transition-colors flex items-center justify-between group" data-testid={`billing-ready-${wo.id}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <button className="font-semibold text-sc hover:text-sc-blue transition-colors text-sm" onClick={() => navigate(`/work-orders/${wo.id}`)}>{wo.number}</button>
                        <span className="text-xs text-sc-3">{c?.name}</span>
                      </div>
                      <div className="text-sm font-bold text-sc mt-1">{money(total)}</div>
                    </div>
                    <Button size="sm" className="text-white blue-glow-soft" style={{background:'var(--sc-btn)',border:'1px solid var(--sc-btn-highlight)'}} onClick={() => createInvoice(wo.id)} data-testid={`button-create-invoice-${wo.id}`}>
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
          <Card className="sc-panel overflow-hidden border-0">
            <CardHeader className="border-b border-panel py-4 px-5" style={{ background: "var(--sc-inner)" }}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-sc flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sc-3" /> Invoice Management
                </CardTitle>
                <Badge variant="outline" className="border-panel-strong text-sc-2 bg-transparent">{recentInvoices.length} Recent</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-[color:var(--sc-line-subtle)] h-[calc(100vh-24rem)] overflow-y-auto scrollbar-thin">
              {recentInvoices.length === 0 ? <div className="p-6 text-center text-sm text-sc-3">No recent invoices.</div> : recentInvoices.map((inv) => {
                const c = customers.find((cc) => cc.id === inv.customerId);
                return (
                  <div key={inv.id} className="p-4 hover:bg-white/[0.04] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sc text-sm">{inv.number}</span>
                        <Badge variant="outline" className={`text-[10px] ${billingClass(inv.status)} bg-transparent border-panel-strong`}>{inv.status}</Badge>
                      </div>
                      <div className="text-xs text-sc-3 mt-1">{c?.name}</div>
                    </div>
                    <div className="flex items-center gap-4 sm:text-right">
                      <div>
                        <div className="font-bold text-sc">{money(inv.amount)}</div>
                        <div className="text-xs text-sc-3 mt-0.5">Due {shortDate(inv.dueDate)}</div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-sc-3 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/[0.05]">
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
        <DialogContent className="max-w-2xl bg-card border-panel text-sc">
          {selectedInvoice && (() => {
            const customer = customers.find(c => c.id === selectedInvoice.customerId);
            return (
              <>
                <DialogHeader className="border-b border-panel pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <DialogTitle className="text-xl text-sc">Invoice {selectedInvoice.number}</DialogTitle>
                      <DialogDescription className="mt-1 flex items-center gap-2 text-sc-3">
                        <Badge variant="outline" className={billingClass(selectedInvoice.status)}>{selectedInvoice.status}</Badge>
                        <span>Created {shortDate(selectedInvoice.createdAt)}</span>
                      </DialogDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-sc">{money(selectedInvoice.amount)}</div>
                      <div className="text-sm text-sc-3">Due {shortDate(selectedInvoice.dueDate)}</div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="py-4 space-y-6">
                  <div className="flex justify-between p-4 sc-inner border-0 rounded-lg">
                    <div>
                      <div className="text-xs font-semibold uppercase text-sc-3 tracking-wider mb-1">Bill To</div>
                      <div className="font-semibold flex items-center gap-2 text-sc"><Building2 className="w-4 h-4 text-sc-3" /> {customer?.name}</div>
                      <div className="text-sm text-sc-2 mt-1">{customer?.contacts[0]?.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold uppercase text-sc-3 tracking-wider mb-1">From</div>
                      <div className="font-semibold text-sc">ServiceConnect App</div>
                      <div className="text-sm text-sc-2 mt-1">billing@serviceconnect.app</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase text-sc-3 tracking-wider mb-2">Line Items</div>
                    <div className="border border-panel rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="text-sc-3 border-b border-panel" style={{ background: "var(--sc-inner)" }}>
                          <tr>
                            <th className="px-4 py-2 text-left font-medium">Description</th>
                            <th className="px-4 py-2 text-right font-medium">Qty</th>
                            <th className="px-4 py-2 text-right font-medium">Rate</th>
                            <th className="px-4 py-2 text-right font-medium">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[color:var(--sc-line-subtle)] text-sc-2">
                          {selectedInvoice.lines.map((line, i) => (
                            <tr key={i}>
                              <td className="px-4 py-3">{line.description}</td>
                              <td className="px-4 py-3 text-right">{line.quantity}</td>
                              <td className="px-4 py-3 text-right">{money(line.rate)}</td>
                              <td className="px-4 py-3 text-right font-medium text-sc">{money(line.quantity * line.rate)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t border-panel" style={{ background: "var(--sc-inner)" }}>
                          <tr>
                            <td colSpan={3} className="px-4 py-3 text-right font-semibold text-sc-2">Total</td>
                            <td className="px-4 py-3 text-right font-bold text-sc">{money(selectedInvoice.amount)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                <DialogFooter className="border-t border-panel pt-4 sm:justify-between">
                  <Button variant="outline" className="text-sc-2 hover:text-white border-panel hover:bg-white/[0.05]" onClick={() => setSelectedInvoice(null)}>Close</Button>
                  <div className="flex gap-2">
                    <Button variant="outline" className="text-sc-2 hover:text-white border-panel hover:bg-white/[0.05]">
                      <LinkIcon className="w-4 h-4 mr-2" /> Copy Link
                    </Button>
                    <Button onClick={() => handleSendInvoice(selectedInvoice)} disabled={selectedInvoice.status !== "Ready for Invoice"} className="text-white blue-glow-soft" style={{background:'var(--sc-btn)',border:'1px solid var(--sc-btn-highlight)'}}>
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
