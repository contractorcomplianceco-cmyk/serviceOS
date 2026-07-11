import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { MapPin, Wrench, ShieldOff, Truck, Phone, ChevronRight } from "lucide-react";

export default function Technicians() {
  const { users, workOrders, customers } = useAppStore();
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState<string | null>(null);

  const techs = users.filter((u) => u.role === "Technician" || u.role === "Lead Technician" || u.role === "Subcontractor");
  const active = techs.find((t) => t.id === selected);
  const activeJobs = active ? workOrders.filter((w) => w.assignedTechnicianId === active.id && !["Closed", "Cancelled"].includes(w.status)) : [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Technicians</h1>
        <p className="text-muted-foreground">Skills, zones, workload, and truck inventory across the field team.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {techs.map((tech) => {
          const load = tech.workloadHours ?? 0;
          const cap = tech.capacityHours ?? 8;
          const over = load > cap;
          return (
            <Card key={tech.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelected(tech.id === selected ? null : tech.id)} data-testid={`tech-${tech.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {tech.name}
                      {tech.role === "Lead Technician" && <Badge variant="secondary" className="text-[10px]">Lead</Badge>}
                      {tech.role === "Subcontractor" && <Badge variant="outline" className="text-[10px]">Sub</Badge>}
                    </CardTitle>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {tech.zone}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {tech.phone}</span>
                      {tech.truckId && <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {tech.truckId}</span>}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${selected === tech.id ? "rotate-90" : ""}`} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Today's load</span>
                    <span className={over ? "text-destructive font-semibold" : "font-medium"}>{load}/{cap} hrs</span>
                  </div>
                  <Progress value={Math.min(100, (load / cap) * 100)} className={over ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tech.skills?.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px] bg-blue-500/5 text-blue-600 border-blue-500/20"><Wrench className="w-2.5 h-2.5 mr-1" />{s}</Badge>
                  ))}
                  {tech.restrictedTasks?.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px] bg-slate-100 text-slate-500 border-slate-200"><ShieldOff className="w-2.5 h-2.5 mr-1" />No {s}</Badge>
                  ))}
                </div>

                {selected === tech.id && (
                  <div className="pt-3 border-t space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Jobs ({activeJobs.length})</div>
                    {activeJobs.length === 0 ? <p className="text-sm text-muted-foreground">No active jobs.</p> : activeJobs.map((j) => {
                      const c = customers.find((cc) => cc.id === j.customerId);
                      return (
                        <Button key={j.id} variant="outline" size="sm" className="w-full justify-between" onClick={(e) => { e.stopPropagation(); navigate(`/work-orders/${j.id}`); }} data-testid={`tech-job-${j.id}`}>
                          <span>{j.number} · {c?.name}</span>
                          <Badge variant="secondary" className="text-[10px]">{j.status}</Badge>
                        </Button>
                      );
                    })}
                    <div className="text-xs text-muted-foreground pt-1">GPS consent: {tech.gpsConsent ? "Enabled" : "Not enabled"}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
