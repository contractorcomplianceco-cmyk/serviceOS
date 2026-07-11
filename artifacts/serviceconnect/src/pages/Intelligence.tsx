import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, ShieldCheck, Check, X, ArrowRight } from "lucide-react";
import type { AIRecommendation } from "@/lib/types";

export default function Intelligence() {
  const { recommendations, dismissRecommendation } = useAppStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const severityStyle = (s: AIRecommendation["severity"]) =>
    s === "urgent" ? "border-l-destructive"
    : s === "warning" ? "border-l-amber-500"
    : "border-l-blue-500";

  const badgeStyle = (s: AIRecommendation["severity"]) =>
    s === "urgent" ? "bg-destructive/10 text-destructive border-destructive/20"
    : s === "warning" ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
    : "bg-blue-500/10 text-blue-600 border-blue-500/20";

  const accept = (r: AIRecommendation) => {
    toast({ title: `${r.primaryAction} drafted`, description: `Drafted "${r.title}". Nothing was scheduled, sent, or invoiced automatically — review to finalize.` });
    dismissRecommendation(r.id);
  };
  const dismiss = (r: AIRecommendation) => {
    dismissRecommendation(r.id);
    toast({ title: "Dismissed", description: `"${r.title}" removed from recommendations.` });
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center"><Sparkles className="w-6 h-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">RoseOS Intelligence</h1>
          <p className="text-muted-foreground">Proactive recommendations across the business. You approve every action.</p>
        </div>
      </div>

      <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-slate-700">
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
        <div><span className="font-semibold">Guardrail:</span> RoseOS never schedules, sends, or invoices on its own. Every suggestion below is a draft awaiting your decision.</div>
      </div>

      <div className="space-y-3">
        {recommendations.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground">All caught up — no pending recommendations.</CardContent></Card> : recommendations.map((r) => {
          const isWorkOrder = r.relatedEntityId?.startsWith("wo");
          return (
            <Card key={r.id} className={`border-l-4 ${severityStyle(r.severity)}`} data-testid={`rec-${r.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{r.title}</CardTitle>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">{r.type}</Badge>
                    <Badge variant="outline" className={`${badgeStyle(r.severity)} text-[10px]`}>{r.confidence}% conf.</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{r.description}</p>
                <div className="flex items-center gap-2 pt-1">
                  {r.needsApproval ? (
                    <>
                      <Button size="sm" className="bg-primary text-white" onClick={() => accept(r)} data-testid={`button-accept-${r.id}`}><Check className="w-3.5 h-3.5 mr-1" /> {r.primaryAction} (Draft)</Button>
                      <Button size="sm" variant="outline" onClick={() => dismiss(r)} data-testid={`button-dismiss-${r.id}`}><X className="w-3.5 h-3.5 mr-1" /> Dismiss</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => dismiss(r)} data-testid={`button-ack-${r.id}`}><Check className="w-3.5 h-3.5 mr-1" /> Acknowledge</Button>
                  )}
                  {isWorkOrder && <Button size="sm" variant="ghost" className="text-primary" onClick={() => navigate(`/work-orders/${r.relatedEntityId}`)} data-testid={`button-view-${r.id}`}>View job <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
