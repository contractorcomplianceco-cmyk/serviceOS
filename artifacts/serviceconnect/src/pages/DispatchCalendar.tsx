import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { priorityClass } from "@/lib/ui";
import { Sparkles, MapPin, AlertTriangle, Clock } from "lucide-react";

export default function DispatchCalendar() {
  const { workOrders, users, customers, locations, updateWorkOrder } = useAppStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [region, setRegion] = useState<"Tampa" | "Orlando">("Tampa");

  const techs = users.filter((u) => (u.role === "Technician" || u.role === "Lead Technician") && u.zone === region);
  const unassigned = workOrders.filter((w) => !w.assignedTechnicianId && w.region === region && !["Closed", "Cancelled", "Invoiced"].includes(w.status));

  const jobFor = (techId: string) => workOrders.filter((w) => w.assignedTechnicianId === techId && !["Closed", "Cancelled", "Invoiced"].includes(w.status));

  const autoAssign = (woId: string, techId: string) => {
    updateWorkOrder(woId, { assignedTechnicianId: techId, status: "Scheduled" });
    toast({ title: "Assignment drafted", description: "RoseOS routed this job. Review the schedule — the customer isn't notified until you approve the portal update." });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Dispatch Board</h1>
          <p className="text-muted-foreground">Balance technician load. RoseOS suggests routing — you approve every assignment.</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(["Tampa", "Orlando"] as const).map((r) => (
            <button key={r} onClick={() => setRegion(r)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${region === r ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`} data-testid={`button-region-${r}`}>{r}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Unassigned ({unassigned.length})
          </h2>
          {unassigned.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">All {region} jobs are assigned.</CardContent></Card>
          ) : unassigned.map((wo) => {
            const customer = customers.find((c) => c.id === wo.customerId);
            const loc = locations.find((l) => l.id === wo.locationId);
            const suggested = techs[0];
            return (
              <Card key={wo.id} className="border-l-4 border-l-amber-500" data-testid={`unassigned-${wo.id}`}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <button onClick={() => navigate(`/work-orders/${wo.id}`)} className="font-semibold text-primary text-sm hover:underline">{wo.number}</button>
                    <Badge variant="outline" className={priorityClass(wo.priority)}>{wo.priority}</Badge>
                  </div>
                  <div className="text-sm font-medium">{customer?.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {loc?.name}</div>
                  {suggested && (
                    <div className="bg-primary/5 border border-primary/20 rounded-md p-2 text-xs">
                      <div className="flex items-center gap-1 text-primary font-medium mb-1"><Sparkles className="w-3 h-3" /> RoseOS suggests {suggested.name}</div>
                      <Button size="sm" className="w-full h-7 bg-primary text-white text-xs" onClick={() => autoAssign(wo.id, suggested.id)} data-testid={`button-assign-${wo.id}`}>Assign & Schedule</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Technician Load — {region}</h2>
          {techs.map((tech) => {
            const jobs = jobFor(tech.id);
            const load = tech.workloadHours ?? 0;
            const cap = tech.capacityHours ?? 8;
            const pct = Math.min(100, (load / cap) * 100);
            const over = load > cap;
            return (
              <Card key={tech.id} data-testid={`tech-lane-${tech.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {tech.name}
                      {tech.role === "Lead Technician" && <Badge variant="secondary" className="text-[10px]">Lead</Badge>}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className={over ? "text-destructive font-semibold" : "text-muted-foreground"}>{load}/{cap} hrs</span>
                      {over && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">Overloaded</Badge>}
                    </div>
                  </div>
                  <Progress value={pct} className={over ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"} />
                </CardHeader>
                <CardContent>
                  {jobs.length === 0 ? <p className="text-sm text-muted-foreground">No jobs scheduled.</p> : (
                    <div className="flex flex-wrap gap-2">
                      {jobs.map((j) => {
                        const c = customers.find((cc) => cc.id === j.customerId);
                        return (
                          <button key={j.id} onClick={() => navigate(`/work-orders/${j.id}`)} className="text-left border rounded-md px-3 py-1.5 hover:border-primary transition-colors" data-testid={`job-chip-${j.id}`}>
                            <div className="text-xs font-medium">{j.number}</div>
                            <div className="text-[11px] text-muted-foreground">{c?.name} · {j.timeWindow ?? "Flexible"}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
