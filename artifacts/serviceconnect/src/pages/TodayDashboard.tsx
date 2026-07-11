import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { AIRecommendation } from "@/lib/types";
import {
  AlertCircle, CalendarClock, DollarSign, CheckCircle2, ShieldAlert,
  ArrowRight, Sparkles, Clock, Wrench, Navigation, Check, Edit2, Users
} from "lucide-react";

export default function TodayDashboard() {
  const { recommendations, workOrders, invoices, currentUser, dismissRecommendation } = useAppStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const emergency = workOrders.filter((w) => w.priority === "Emergency" && w.status !== "Closed").length;
  const needScheduled = workOrders.filter((w) => w.status === "Need Scheduled" || w.status === "New").length;
  const readyBilling = workOrders.filter((w) => w.status === "Ready for Billing" || w.status === "Completed Pending Review").length;
  const pastDue = invoices.filter((i) => i.status === "Past Due").length;
  const activeJobs = workOrders.filter((w) => ["Scheduled", "First Trip", "On Site"].includes(w.status)).slice(0, 5);

  const stats = [
    { label: "Emergency Jobs", value: emergency, icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Need Scheduled", value: needScheduled, icon: CalendarClock, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Ready for Billing", value: readyBilling, icon: DollarSign, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Past Due AR", value: pastDue, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  const handleAct = (rec: AIRecommendation) => {
    if (rec.type === "Scheduling" && rec.relatedEntityId) return navigate(`/work-orders/${rec.relatedEntityId}`);
    if (rec.type === "Overload") return navigate("/dispatch");
    if (rec.type === "Billing" && rec.relatedEntityId) return navigate(`/work-orders/${rec.relatedEntityId}`);
    if (rec.type === "AR") return navigate("/accounting");
    if (rec.type === "Inventory") return navigate("/inventory");
    if (rec.type === "Document") return navigate("/documents");
    if (rec.relatedEntityId?.startsWith("wo")) return navigate(`/work-orders/${rec.relatedEntityId}`);
    toast({ title: `${rec.primaryAction} drafted`, description: "RoseOS drafted this action for your review." });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Operations Cockpit</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Good morning, {currentUser.name.split(" ")[0]}. System online. All telemetry is nominal.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-slate-200 bg-white shadow-sm" onClick={() => navigate("/work-orders")}>
            <Wrench className="w-4 h-4 mr-2 text-slate-500" /> All Work Orders
          </Button>
          <Button className="bg-primary text-primary-foreground shadow-md hover:bg-primary/90" onClick={() => navigate("/dispatch")}>
            <Navigation className="w-4 h-4 mr-2" /> Dispatch Board
          </Button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow bg-white" data-testid={`stat-${s.label}`}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{s.label}</p>
                <p className="text-3xl font-bold text-slate-900">{s.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.bg}`}>
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Main Work Area (Left 2 columns) */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="border border-slate-200/60 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-primary" /> Priority Dispatch Overview
                </CardTitle>
                <Badge variant="secondary" className="bg-white border-slate-200 text-slate-600 font-medium">
                  Active Jobs Today: {activeJobs.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {activeJobs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No active jobs scheduled.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activeJobs.map((wo) => (
                    <div key={wo.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer" onClick={() => navigate(`/work-orders/${wo.id}`)}>
                      <div className="flex items-start gap-4">
                        <div className={`mt-0.5 w-2.5 h-2.5 rounded-full ${wo.priority === 'Emergency' ? 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]' : wo.priority === 'High' ? 'bg-amber-500' : 'bg-primary'}`} />
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{wo.number} · {wo.source}</p>
                          <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{wo.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="outline" className="text-[10px] text-slate-600 border-slate-200 bg-white">
                              {wo.status}
                            </Badge>
                            {wo.assignedTechnicianId && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Users className="w-3 h-3" /> Tech Assigned
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary transition-opacity">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: RoseOS Intelligence */}
        <div className="xl:col-span-1">
          <Card className="border-0 bg-slate-900 text-slate-100 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-14rem)] sticky top-24">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <CardHeader className="border-b border-slate-800/50 pb-4 relative z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> RoseOS Intelligence
                </CardTitle>
                <Badge variant="outline" className="bg-primary/20 text-primary-foreground border-primary/30 text-[10px] uppercase font-bold tracking-wider">
                  {recommendations.length} Pending
                </Badge>
              </div>
              <CardDescription className="text-slate-400 text-xs mt-1">
                AI-assisted operational drafts requiring human approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto space-y-4 relative z-10 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {recommendations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  <p className="text-sm font-medium">All clear. No operational anomalies detected.</p>
                </div>
              ) : (
                recommendations.map((rec) => (
                  <div key={rec.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 hover:border-primary/50 transition-colors group">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <Badge variant="outline" className="bg-slate-900/50 text-slate-300 border-slate-700 text-[10px] font-mono">
                        {rec.confidence}% CONFIDENCE
                      </Badge>
                      {rec.needsApproval && (
                        <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30 bg-amber-400/10 uppercase tracking-wide">
                          Needs Human Approval
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm text-white leading-tight mb-1.5">{rec.title}</h3>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">{rec.description}</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button size="sm" className="bg-primary text-white hover:bg-primary/90 text-xs h-8 flex-1" onClick={() => handleAct(rec)}>
                        <Check className="w-3.5 h-3.5 mr-1.5" /> Approve Draft
                      </Button>
                      <div className="flex gap-2 flex-1">
                        <Button size="sm" variant="outline" className="bg-transparent border-slate-600 hover:bg-slate-700 text-slate-300 hover:text-white text-xs h-8 flex-1" onClick={() => handleAct(rec)}>
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="text-slate-500 hover:text-slate-300 hover:bg-slate-800 text-xs h-8 px-2" onClick={() => dismissRecommendation(rec.id)}>
                          Snooze
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
