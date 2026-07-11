import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, ShieldCheck, Check, X, ArrowRight, Edit2 } from "lucide-react";
import type { AIRecommendation } from "@/lib/types";
import { computeRecommendations } from "@/lib/recommendations";

export default function Intelligence() {
  const store = useAppStore();
  const { dismissRecommendation, logAudit } = store;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const recommendations = useMemo(
    () => computeRecommendations(store),
    [store.workOrders, store.users, store.inventory, store.documents, store.invoices, store.customers, store.dismissedRecIds]
  );

  // Route an approved recommendation to the entity it concerns (where trivial),
  // otherwise record an audit event. Nothing is ever auto-sent or auto-invoiced.
  const routeFor = (r: AIRecommendation): string | null => {
    switch (r.type) {
      case "Scheduling":
        return r.relatedEntityId ? `/work-orders/${r.relatedEntityId}` : "/dispatch";
      case "Overload":
        return "/dispatch";
      case "Billing":
        return r.relatedEntityId ? `/work-orders/${r.relatedEntityId}` : "/billing";
      case "Missing Info":
        return r.relatedEntityId ? `/work-orders/${r.relatedEntityId}` : null;
      case "AR":
        return "/accounting";
      case "Inventory":
        return "/inventory";
      case "Document":
        return "/documents";
      default:
        return r.relatedEntityId?.startsWith("wo") ? `/work-orders/${r.relatedEntityId}` : null;
    }
  };

  const accept = (r: AIRecommendation) => {
    const dest = routeFor(r);
    logAudit({ action: `${r.primaryAction} (Draft)`, entityType: "WorkOrder", entityId: r.relatedEntityId ?? r.id, summary: `Reviewed recommendation: ${r.title}` });
    if (dest) {
      navigate(dest);
      return;
    }
    toast({ title: `${r.primaryAction} drafted`, description: `Drafted "${r.title}". Nothing was scheduled, sent, or invoiced automatically — review to finalize.` });
    dismissRecommendation(r.id);
  };
  
  const dismiss = (r: AIRecommendation) => {
    dismissRecommendation(r.id);
    toast({ title: "Dismissed", description: `"${r.title}" removed from recommendations.` });
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center relative overflow-hidden" style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}>
           <div className="absolute inset-0 bg-[rgba(67,166,255,0.2)] blur-xl"></div>
           <Sparkles className="w-7 h-7 text-sc-blue relative z-10" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">RoseOS Intelligence</h1>
          <p className="text-sc-2 mt-1 text-sm">
            Proactive recommendations across the business. You approve every action.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl p-5 text-sm text-sc-3 shadow-lg relative overflow-hidden" style={{ background: "var(--sc-inner)", border: "1px solid var(--sc-line)" }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-[rgba(67,166,255,0.1)] rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0 text-sc-blue relative z-10" />
        <div className="relative z-10 leading-relaxed"><span className="font-semibold text-sc">Guardrail:</span> RoseOS never schedules, sends, or invoices on its own. Every suggestion below is a draft awaiting your human decision. Nothing happens without your explicit approval.</div>
      </div>

      <div className="space-y-4">
        {recommendations.length === 0 ? (
          <Card className="sc-panel border-0">
            <CardContent className="py-16 flex flex-col items-center justify-center text-center space-y-4">
               <div className="w-16 h-16 rounded-full bg-[rgba(56,212,119,0.1)] flex items-center justify-center">
                 <Check className="w-8 h-8 text-[color:var(--sc-green)]" />
               </div>
               <div>
                  <h3 className="text-lg font-semibold text-sc">All caught up</h3>
                  <p className="text-sc-3 max-w-md mx-auto mt-1 text-sm">No pending anomalies or optimizations detected across your operations.</p>
               </div>
            </CardContent>
          </Card>
        ) : recommendations.map((r) => {
          const isWorkOrder = r.relatedEntityId?.startsWith("wo");
          
          return (
            <Card key={r.id} className="border-0 shadow-xl overflow-hidden group circuit-texture" style={{ background: "var(--sc-panel)" }} data-testid={`rec-${r.id}`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-[rgba(67,166,255,0.05)] rounded-full blur-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="p-6 relative z-10">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="text-sc-blue border-[color:var(--sc-line-strong)] text-[10px] uppercase font-mono tracking-wider bg-transparent">
                        {r.confidence}% Confidence
                      </Badge>
                      {r.needsApproval && (
                         <Badge variant="outline" className="text-[10px] text-[color:var(--sc-orange)] border-[color:var(--sc-orange)] bg-[rgba(255,157,24,0.1)] uppercase tracking-wide">
                           Needs Human Approval
                         </Badge>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-sc mb-2">{r.title}</h3>
                    <p className="text-sc-2 text-sm leading-relaxed max-w-3xl">{r.description}</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0 md:pt-8">
                    {r.needsApproval ? (
                      <>
                        <Button className="text-white blue-glow-soft" style={{background:'var(--sc-btn)',border:'1px solid var(--sc-btn-highlight)'}} onClick={() => accept(r)} data-testid={`button-accept-${r.id}`}>
                          <Check className="w-4 h-4 mr-2" /> {r.primaryAction} (Draft)
                        </Button>
                        <Button variant="outline" className="bg-transparent text-sc-2 hover:text-white" style={{border:'1px solid var(--sc-line)'}} onClick={() => dismiss(r)} data-testid={`button-dismiss-${r.id}`}>
                          <X className="w-4 h-4 mr-2" /> Dismiss
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" className="bg-transparent text-sc-2 hover:text-white" style={{border:'1px solid var(--sc-line)'}} onClick={() => dismiss(r)} data-testid={`button-ack-${r.id}`}>
                        <Check className="w-4 h-4 mr-2" /> Acknowledge
                      </Button>
                    )}
                    {isWorkOrder && (
                      <Button variant="ghost" className="text-sc-blue hover:bg-white/[0.04]" onClick={() => navigate(`/work-orders/${r.relatedEntityId}`)} data-testid={`button-view-${r.id}`}>
                         View job <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
