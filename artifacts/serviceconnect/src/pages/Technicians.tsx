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
        <h1 className="text-3xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Technicians</h1>
        <p className="text-slate-500 text-sm">Skills, zones, workload, and truck inventory across the field team.</p>
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
              className={`cursor-pointer transition-all duration-200 border bg-white shadow-sm hover:shadow-md ${isSelected ? "border-primary ring-1 ring-primary/20" : "border-slate-200/60 hover:border-slate-300"}`} 
              onClick={() => setSelected(isSelected ? null : tech.id)} 
              data-testid={`tech-${tech.id}`}
            >
              <CardHeader className="pb-3 px-5 pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-semibold text-slate-900">{tech.name}</CardTitle>
                      {tech.role === "Lead Technician" && <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-600 border-slate-200">Lead</Badge>}
                      {tech.role === "Subcontractor" && <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Sub</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {tech.zone || "Unassigned"}</span>
                      {tech.truckId && <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-slate-400" /> {tech.truckId}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {tech.phone}</span>
                    </div>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isSelected ? "bg-primary/10 text-primary" : "bg-slate-50 text-slate-400"}`}>
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isSelected ? "rotate-90" : ""}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-600 font-medium uppercase tracking-wider">Today's Load</span>
                    <span className={`font-bold ${over ? "text-destructive" : "text-slate-700"}`}>{load} / {cap} hrs</span>
                  </div>
                  <Progress value={pct} className={`h-2 ${over ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"}`} />
                </div>
                
                <div className="space-y-2">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Qualifications</div>
                  <div className="flex flex-wrap gap-1.5">
                    {tech.skills?.map((s) => (
                      <Badge key={s} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-medium hover:bg-blue-50">
                        <Wrench className="w-3 h-3 mr-1.5 opacity-70" />{s}
                      </Badge>
                    ))}
                    {tech.restrictedTasks?.map((s) => (
                      <Badge key={s} variant="outline" className="text-xs bg-slate-50 text-slate-500 border-slate-200 font-medium hover:bg-slate-50">
                        <ShieldOff className="w-3 h-3 mr-1.5 opacity-70" />No {s}
                      </Badge>
                    ))}
                    {(!tech.skills?.length && !tech.restrictedTasks?.length) && (
                      <span className="text-xs text-slate-400 italic">No qualifications listed</span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="pt-4 border-t border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3" /> Active Jobs ({activeJobs.length})
                    </div>
                    {activeJobs.length === 0 ? (
                      <div className="bg-slate-50 border border-slate-100 rounded-md p-3 text-center text-xs text-slate-500">
                        No active jobs assigned today.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeJobs.map((j) => {
                          const c = customers.find((cc) => cc.id === j.customerId);
                          return (
                            <button 
                              key={j.id} 
                              className="w-full text-left group bg-white border border-slate-200 hover:border-primary/50 hover:shadow-sm rounded-md p-2.5 transition-all"
                              onClick={(e) => { e.stopPropagation(); navigate(`/work-orders/${j.id}`); }} 
                              data-testid={`tech-job-${j.id}`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-sm text-slate-900 group-hover:text-primary transition-colors">{j.number}</span>
                                <Badge variant="secondary" className="text-[9px] uppercase tracking-wider bg-slate-100 text-slate-600 border-slate-200">{j.status}</Badge>
                              </div>
                              <div className="text-xs text-slate-500 truncate">{c?.name}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 font-medium">
                      <span>GPS Tracking</span>
                      <span className={tech.gpsConsent ? "text-emerald-500" : "text-amber-500"}>
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