import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { AIRecommendation } from "@/lib/types";
import {
  AlertCircle, CalendarClock, DollarSign, CheckCircle2, ShieldAlert,
  ArrowRight, Sparkles, Clock,
} from "lucide-react";

const sevStyle: Record<AIRecommendation["severity"], string> = {
  urgent: "border-l-destructive",
  warning: "border-l-amber-500",
  info: "border-l-blue-500",
};

export default function TodayDashboard() {
  const { recommendations, workOrders, invoices, currentUser, dismissRecommendation } = useAppStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const emergency = workOrders.filter((w) => w.priority === "Emergency" && w.status !== "Closed").length;
  const needScheduled = workOrders.filter((w) => w.status === "Need Scheduled" || w.status === "New").length;
  const readyBilling = workOrders.filter((w) => w.status === "Ready for Billing" || w.status === "Completed Pending Review").length;
  const pastDue = invoices.filter((i) => i.status === "Past Due").length;

  const stats = [
    { label: "Emergency Jobs", value: emergency, icon: ShieldAlert, accent: "border-l-destructive", color: "text-destructive" },
    { label: "Needs Scheduling", value: needScheduled, icon: CalendarClock, accent: "border-l-amber-500", color: "text-amber-600" },
    { label: "Ready for Billing", value: readyBilling, icon: DollarSign, accent: "border-l-blue-500", color: "text-blue-600" },
    { label: "Past Due Invoices", value: pastDue, icon: AlertCircle, accent: "border-l-destructive", color: "text-destructive" },
  ];

  const handleAct = (rec: AIRecommendation) => {
    if (rec.type === "Scheduling" && rec.relatedEntityId) return navigate(`/work-orders/${rec.relatedEntityId}`);
    if (rec.type === "Overload") return navigate("/dispatch");
    if (rec.type === "Billing" && rec.relatedEntityId) return navigate(`/work-orders/${rec.relatedEntityId}`);
    if (rec.type === "AR") return navigate("/accounting");
    if (rec.type === "Inventory") return navigate("/inventory");
    if (rec.type === "Document") return navigate("/documents");
    if (rec.relatedEntityId?.startsWith("wo")) return navigate(`/work-orders/${rec.relatedEntityId}`);
    toast({ title: `${rec.primaryAction} queued`, description: "RoseOS drafted this action for your review — nothing sent automatically." });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Daily Operations Brief</h1>
          <p className="text-muted-foreground">
            Good morning, {currentUser.name.split(" ")[0]}. Here's what RoseOS flagged for your attention today.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/intelligence")} data-testid="button-view-intelligence">
          <Sparkles className="w-4 h-4 mr-2 text-primary" /> Intelligence Center
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className={`border-l-4 ${s.accent}`} data-testid={`stat-${s.label}`}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500">{s.label}</CardTitle>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> RoseOS Recommendation Queue
          </h2>
          <Badge variant="outline" className="text-xs text-slate-500">
            {recommendations.length} items · approval required before any action
          </Badge>
        </div>

        {recommendations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              You're all caught up. No pending recommendations.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recommendations.map((rec) => (
              <Card key={rec.id} className={`border-l-4 ${sevStyle[rec.severity]}`} data-testid={`rec-${rec.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
                      {rec.confidence}% confidence · {rec.type}
                    </Badge>
                    {rec.needsApproval && (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30 bg-amber-500/10">
                        <Clock className="w-3 h-3 mr-1" /> Needs approval
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base mt-2">{rec.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 mb-4">{rec.description}</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-primary text-white hover:bg-primary/90" onClick={() => handleAct(rec)} data-testid={`button-act-${rec.id}`}>
                      {rec.primaryAction} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => dismissRecommendation(rec.id)} data-testid={`button-dismiss-${rec.id}`}>
                      Dismiss
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
