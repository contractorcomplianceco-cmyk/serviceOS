import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, ShieldCheck, Check, X, ArrowRight, Edit2 } from "lucide-react";
import type { AIRecommendation } from "@/lib/types";

export default function Intelligence() {
  const { recommendations, dismissRecommendation } = useAppStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const accept = (r: AIRecommendation) => {
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
        <div className="w-14 h-14 rounded-2xl bg-slate-900 shadow-xl flex items-center justify-center border border-slate-800 relative overflow-hidden">
           <div className="absolute inset-0 bg-primary/20 blur-xl"></div>
           <Sparkles className="w-7 h-7 text-primary relative z-10" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">RoseOS Intelligence</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Proactive recommendations across the business. You approve every action.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-slate-900 border border-slate-800 rounded-xl p-5 text-sm text-slate-300 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0 text-primary relative z-10" />
        <div className="relative z-10 leading-relaxed"><span className="font-semibold text-white">Guardrail:</span> RoseOS never schedules, sends, or invoices on its own. Every suggestion below is a draft awaiting your human decision. Nothing happens without your explicit approval.</div>
      </div>

      <div className="space-y-4">
        {recommendations.length === 0 ? (
          <Card className="border border-slate-200/60 bg-white">
            <CardContent className="py-16 flex flex-col items-center justify-center text-center space-y-4">
               <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                 <Check className="w-8 h-8 text-emerald-500" />
               </div>
               <div>
                  <h3 className="text-lg font-semibold text-slate-900">All caught up</h3>
                  <p className="text-slate-500 max-w-md mx-auto mt-1 text-sm">No pending anomalies or optimizations detected across your operations.</p>
               </div>
            </CardContent>
          </Card>
        ) : recommendations.map((r) => {
          const isWorkOrder = r.relatedEntityId?.startsWith("wo");
          
          return (
            <Card key={r.id} className="border-0 bg-slate-900 shadow-xl overflow-hidden group" data-testid={`rec-${r.id}`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="p-6 relative z-10">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700 text-[10px] uppercase font-mono tracking-wider">
                        {r.confidence}% Confidence
                      </Badge>
                      {r.needsApproval && (
                         <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30 bg-amber-400/10 uppercase tracking-wide">
                           Needs Human Approval
                         </Badge>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{r.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">{r.description}</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0 md:pt-8">
                    {r.needsApproval ? (
                      <>
                        <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20" onClick={() => accept(r)} data-testid={`button-accept-${r.id}`}>
                          <Check className="w-4 h-4 mr-2" /> {r.primaryAction} (Draft)
                        </Button>
                        <Button variant="outline" className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => dismiss(r)} data-testid={`button-dismiss-${r.id}`}>
                          <X className="w-4 h-4 mr-2" /> Dismiss
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => dismiss(r)} data-testid={`button-ack-${r.id}`}>
                        <Check className="w-4 h-4 mr-2" /> Acknowledge
                      </Button>
                    )}
                    {isWorkOrder && (
                      <Button variant="ghost" className="text-primary hover:bg-primary/10 hover:text-primary" onClick={() => navigate(`/work-orders/${r.relatedEntityId}`)} data-testid={`button-view-${r.id}`}>
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
