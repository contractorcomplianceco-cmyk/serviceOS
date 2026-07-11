import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { MapPin, Wrench, ShieldOff, Truck, Phone, ChevronRight, Briefcase } from "lucide-react";

export default function Technicians() {
  const { users, workOrders, customers } = useAppStore();
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState<string | null>(null);

  const techs = users.filter((u) => u.role === "Technician" || u.role === "Lead Technician" || u.role === "Subcontractor");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">Technicians</h1>
        <p className="text-sc-3 text-sm">Skills, zones, workload, and truck inventory across the field team.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {techs.map((tech) => {
          const load = tech.workloadHours ?? 0;
          const cap = tech.capacityHours ?? 8;
          const over = load > cap;
          const pct = Math.min(100, (load / cap) * 100);
          
          const isSelected = selected === tech.id;
          const activeJobs = workOrders.filter((w) => w.assignedTechnicianId === tech.id && !["Closed", "Cancelled", "Invoiced"].includes(w.status));

          return (
            <Card 
              key={tech.id} 
              className={`cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${isSelected ? "border-[color:var(--sc-line-active)] blue-glow-soft bg-[color:var(--sc-panel-2)]" : "border-panel hover:border-[color:var(--sc-line-strong)] sc-panel"}`} 
              onClick={() => setSelected(isSelected ? null : tech.id)} 
              data-testid={`tech-${tech.id}`}
            >
              <CardHeader className="pb-3 px-5 pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-semibold text-sc">{tech.name}</CardTitle>
                      {tech.role === "Lead Technician" && <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider text-sc-2 border-panel bg-[color:var(--sc-elevated)]">Lead</Badge>}
                      {tech.role === "Subcontractor" && <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-sc-3">Sub</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-sc-3 font-medium">
                      <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-sc-3" /> {tech.zone || "Unassigned"}</span>
                      {tech.truckId && <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-sc-3" /> {tech.truckId}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-sc-3 font-medium">
                      <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-sc-3" /> {tech.phone}</span>
                    </div>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isSelected ? "bg-[color:rgba(67,166,255,0.15)] text-sc-blue" : "bg-[color:var(--sc-elevated)] text-sc-3"}`}>
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isSelected ? "rotate-90" : ""}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="rounded-lg p-3 border border-panel-subtle" style={{ background: "var(--sc-inner)" }}>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-sc-2 font-medium uppercase tracking-wider">Today's Load</span>
                    <span className={`font-bold ${over ? "text-[color:var(--sc-red)]" : "text-sc"}`}>{load} / {cap} hrs</span>
                  </div>
                  <Progress value={pct} className={`h-2 bg-[color:var(--sc-bg)] ${over ? "[&>div]:bg-[color:var(--sc-red)]" : "[&>div]:bg-[color:var(--sc-blue)]"}`} />
                </div>
                
                <div className="space-y-2">
                  <div className="text-[10px] text-sc-3 font-semibold uppercase tracking-wider">Qualifications</div>
                  <div className="flex flex-wrap gap-1.5">
                    {tech.skills?.map((s) => (
                      <Badge key={s} variant="outline" className="text-xs font-medium border-[color:rgba(67,166,255,0.3)] bg-[color:rgba(67,166,255,0.1)] text-sc-blue">
                        <Wrench className="w-3 h-3 mr-1.5 opacity-70" />{s}
                      </Badge>
                    ))}
                    {tech.restrictedTasks?.map((s) => (
                      <Badge key={s} variant="outline" className="text-xs font-medium border-panel bg-[color:var(--sc-elevated)] text-sc-3">
                        <ShieldOff className="w-3 h-3 mr-1.5 opacity-70" />No {s}
                      </Badge>
                    ))}
                    {(!tech.skills?.length && !tech.restrictedTasks?.length) && (
                      <span className="text-xs text-sc-3 italic">No qualifications listed</span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="pt-4 border-t border-panel-subtle space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="text-[10px] font-semibold text-sc-3 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3" /> Active Jobs ({activeJobs.length})
                    </div>
                    {activeJobs.length === 0 ? (
                      <div className="border border-panel-subtle rounded-md p-3 text-center text-xs text-sc-3" style={{ background: "var(--sc-inner)" }}>
                        No active jobs assigned today.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeJobs.map((j) => {
                          const c = customers.find((cc) => cc.id === j.customerId);
                          return (
                            <button 
                              key={j.id} 
                              className="w-full text-left group border border-panel hover:border-[color:var(--sc-line-strong)] hover:bg-white/[0.04] rounded-md p-2.5 transition-all"
                              style={{ background: "var(--sc-panel-2)" }}
                              onClick={(e) => { e.stopPropagation(); navigate(`/work-orders/${j.id}`); }} 
                              data-testid={`tech-job-${j.id}`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-sm text-sc group-hover:text-sc-blue transition-colors">{j.number}</span>
                                <Badge variant="secondary" className="text-[9px] uppercase tracking-wider text-sc-2 border-panel bg-[color:var(--sc-elevated)]">{j.status}</Badge>
                              </div>
                              <div className="text-xs text-sc-3 truncate">{c?.name}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-sc-3 pt-2 font-medium">
                      <span>GPS Tracking</span>
                      <span className={tech.gpsConsent ? "text-[color:var(--sc-green)]" : "text-[color:var(--sc-orange)]"}>
                        {tech.gpsConsent ? "Enabled & Active" : "Not Enabled"}
                      </span>
                    </div>
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