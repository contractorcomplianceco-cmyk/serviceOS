import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { relativeDay } from "@/lib/ui";
import { Sparkles, ShieldCheck, Check, RotateCcw, Languages, Mic, ArrowRight } from "lucide-react";

export default function SupervisorReview() {
  const { closeouts, workOrders, customers, users, updateCloseout, updateWorkOrder } = useAppStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<string | null>(null);

  const pending = closeouts.filter((co) => co.status === "Pending Review");
  const handled = closeouts.filter((co) => co.status !== "Pending Review");

  const approve = (id: string, woId: string) => {
    updateCloseout(id, { status: "Approved" });
    updateWorkOrder(woId, { status: "Ready for Billing", billingStatus: "Ready for Invoice" });
    toast({ title: "Closeout approved", description: "Job moved to the billing queue. Review there before invoicing." });
  };
  const sendBack = (id: string) => {
    updateCloseout(id, { status: "Sent Back" });
    toast({ title: "Sent back to technician", description: "The technician will be asked to revise this closeout draft." });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Supervisor Review</h1>
        <p className="text-muted-foreground">Approve technician VoiceConnect closeouts before anything reaches billing or the customer.</p>
      </div>

      <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-slate-700">
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
        <div><span className="font-semibold">Human-in-the-loop:</span> AI drafts the summary and billing lines. Approval here is the gate — nothing bills or sends automatically.</div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pending Review ({pending.length})</h2>
        <div className="space-y-3">
          {pending.length === 0 ? <Card><CardContent className="py-10 text-center text-muted-foreground">No closeouts awaiting review.</CardContent></Card> : pending.map((co) => {
            const wo = workOrders.find((w) => w.id === co.workOrderId);
            const c = customers.find((cc) => cc.id === wo?.customerId);
            const tech = users.find((u) => u.id === co.technicianId);
            const open = expanded === co.id;
            return (
              <Card key={co.id} className="border-l-4 border-l-primary" data-testid={`closeout-${co.id}`}>
                <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(open ? null : co.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{wo?.number} · {c?.name}</CardTitle>
                      <div className="text-xs text-muted-foreground mt-1">{tech?.name} · submitted {relativeDay(co.submittedAt)}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px]"><Languages className="w-3 h-3 mr-1" />{co.transcriptLanguage}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                    <p className="text-slate-700">{co.aiSummary}</p>
                  </div>

                  {open && (
                    <div className="space-y-3 pt-1">
                      <div className="text-xs bg-slate-50 rounded px-3 py-2 text-slate-600 italic flex gap-2"><Mic className="w-3.5 h-3.5 mt-0.5 shrink-0" /> "{co.transcript}"</div>
                      {co.translatedSummary && <div className="text-xs text-slate-600"><span className="font-medium">Translation: </span>{co.translatedSummary}</div>}
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Billing Lines (draft)</div>
                        <ul className="text-sm space-y-0.5">{co.billingLines.map((b, i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span>{b}</li>)}</ul>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Customer Update (draft)</div>
                        <p className="text-sm text-slate-700">{co.customerUpdateText}</p>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Portal Update (draft)</div>
                        <p className="text-sm text-slate-700">{co.portalUpdateText}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => approve(co.id, co.workOrderId)} data-testid={`button-approve-${co.id}`}><Check className="w-3.5 h-3.5 mr-1" /> Approve → Billing</Button>
                    <Button size="sm" variant="outline" onClick={() => sendBack(co.id)} data-testid={`button-sendback-${co.id}`}><RotateCcw className="w-3.5 h-3.5 mr-1" /> Send Back</Button>
                    <Button size="sm" variant="ghost" className="text-primary ml-auto" onClick={() => setExpanded(open ? null : co.id)} data-testid={`button-toggle-${co.id}`}>{open ? "Hide details" : "View details"}</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {handled.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recently Handled</h2>
          <div className="space-y-2">
            {handled.map((co) => {
              const wo = workOrders.find((w) => w.id === co.workOrderId);
              const c = customers.find((cc) => cc.id === wo?.customerId);
              return (
                <div key={co.id} className="flex items-center justify-between p-3 border rounded-lg text-sm bg-slate-50/50">
                  <div><span className="font-medium">{wo?.number}</span> <span className="text-muted-foreground ml-2">{c?.name}</span></div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={co.status === "Approved" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/30"}>{co.status}</Badge>
                    {co.status === "Approved" && wo && <Button size="sm" variant="ghost" className="text-primary" onClick={() => navigate(`/work-orders/${wo.id}`)} data-testid={`button-view-${co.id}`}>View <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
