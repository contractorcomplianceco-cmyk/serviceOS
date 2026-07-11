import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { priorityClass, shortDate } from "@/lib/ui";
import { Sparkles, MapPin, AlertTriangle, Clock, Calendar as CalendarIcon, Filter, Search, ChevronRight, User as UserIcon, CheckCircle2, Wrench } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export default function DispatchCalendar() {
  const { workOrders, users, customers, locations, updateWorkOrder } = useAppStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [region, setRegion] = useState<"Tampa" | "Orlando">("Tampa");
  const [selectedUnassigned, setSelectedUnassigned] = useState<string | null>(null);

  const techs = users.filter((u) => (u.role === "Technician" || u.role === "Lead Technician") && u.zone === region);
  const unassigned = workOrders.filter((w) => !w.assignedTechnicianId && w.region === region && !["Closed", "Cancelled", "Invoiced"].includes(w.status));

  const jobFor = (techId: string) => workOrders.filter((w) => w.assignedTechnicianId === techId && !["Closed", "Cancelled", "Invoiced"].includes(w.status));

  const autoAssign = (woId: string, techId: string) => {
    updateWorkOrder(woId, { assignedTechnicianId: techId, status: "Scheduled" });
    setSelectedUnassigned(null);
    toast({ title: "Assignment drafted", description: "RoseOS routed this job. Review the schedule before syncing to portal." });
  };

  const selectedWo = unassigned.find(w => w.id === selectedUnassigned);
  const bestTech = techs[0]; // Simple mock logic for RoseOS suggestion

  // Hours array for calendar view (8am to 6pm)
  const hours = Array.from({ length: 11 }, (_, i) => i + 8);

  return (
    <div className="p-6 space-y-6 flex flex-col h-[calc(100vh-4rem)] animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">Dispatch Board</h1>
          <p className="text-sc-3 text-sm mt-1">Review AI-assisted routes and balance technician workload.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex p-1 rounded-lg" style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}>
            {(["Tampa", "Orlando"] as const).map((r) => (
              <button 
                key={r} 
                onClick={() => setRegion(r)} 
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${region === r ? "bg-[color:var(--sc-elevated)] text-sc shadow" : "text-sc-3 hover:text-sc-2"}`} 
                data-testid={`button-region-${r}`}
              >
                {r}
              </button>
            ))}
          </div>
          
          <Button variant="outline" className="text-sc-2 hover:text-white" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}}>
            <CalendarIcon className="w-4 h-4 mr-2 text-sc-3" /> Today
          </Button>
          <Button variant="outline" size="icon" className="text-sc-2 hover:text-white" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}}>
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left Drawer: Unassigned Jobs */}
        <div className="w-80 flex flex-col shadow-sm rounded-xl overflow-hidden shrink-0 border-none sc-panel">
          <div className="p-4 border-b border-panel-subtle flex items-center justify-between" style={{ background: "var(--sc-inner)" }}>
            <h2 className="text-sm font-bold uppercase tracking-wider text-sc flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[color:var(--sc-orange)]" /> Unscheduled 
            </h2>
            <Badge variant="secondary" className="text-[color:var(--sc-orange)]" style={{ background: "rgba(255,157,24,0.1)", border: "1px solid rgba(255,157,24,0.3)" }}>{unassigned.length}</Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-track-transparent">
            {unassigned.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <CheckCircle2 className="w-10 h-10 text-[color:var(--sc-green)] mb-3" />
                <p className="text-sm font-medium text-sc">All caught up</p>
                <p className="text-xs text-sc-3 mt-1">No unscheduled jobs for {region}.</p>
              </div>
            ) : unassigned.map((wo) => {
              const customer = customers.find((c) => c.id === wo.customerId);
              const loc = locations.find((l) => l.id === wo.locationId);
              return (
                <div 
                  key={wo.id} 
                  className="rounded-lg p-3 hover:border-sc-blue/50 hover:shadow-md transition-all cursor-pointer group"
                  style={{ background: "var(--sc-panel-2)", border: "1px solid var(--sc-line)" }}
                  onClick={() => setSelectedUnassigned(wo.id)}
                  data-testid={`unassigned-${wo.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-bold text-sc text-sm group-hover:text-sc-blue transition-colors">{wo.number}</span>
                    <Badge variant="outline" className={`${priorityClass(wo.priority)} text-[9px] px-1.5 py-0`}>{wo.priority}</Badge>
                  </div>
                  <div className="text-xs font-semibold text-sc-2 truncate">{customer?.name}</div>
                  <div className="text-[10px] text-sc-3 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{loc?.city}</span>
                  </div>
                  <div className="mt-3 flex gap-1 flex-wrap">
                    <Badge variant="secondary" className="text-[9px] text-sc-3" style={{ background: "var(--sc-elevated)" }}>{wo.source}</Badge>
                    {wo.materialsFlag && <Badge variant="secondary" className="text-[9px] text-sc-blue" style={{ background: "rgba(67,166,255,0.15)" }}>Materials</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Area: Main Calendar Board */}
        <div className="flex-1 shadow-sm rounded-xl flex flex-col overflow-hidden relative border-none sc-panel">
          {/* Calendar Header Row (Time Blocks) */}
          <div className="flex border-b border-panel-subtle sticky top-0 z-10 shrink-0" style={{ background: "var(--sc-inner)" }}>
            <div className="w-48 shrink-0 p-4 border-r border-panel-subtle flex items-center">
              <span className="text-xs font-bold text-sc-3 uppercase tracking-wider">Technician</span>
            </div>
            <div className="flex-1 flex min-w-[800px]">
              {hours.map(h => (
                <div key={h} className="flex-1 border-r border-[color:var(--sc-line-subtle)] p-2 text-center">
                  <span className="text-[10px] font-bold text-sc-3 uppercase tracking-wider">
                    {h === 12 ? '12 PM' : h > 12 ? `${h-12} PM` : `${h} AM`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar Body (Technician Rows) */}
          <div className="flex-1 overflow-auto scrollbar-thin">
            <div className="min-w-[800px]">
              {techs.map((tech) => {
                const jobs = jobFor(tech.id);
                const load = tech.workloadHours ?? 0;
                const cap = tech.capacityHours ?? 8;
                const pct = Math.min(100, (load / cap) * 100);
                const over = load > cap;

                return (
                  <div key={tech.id} className="flex border-b border-[color:var(--sc-line-subtle)] group" data-testid={`tech-lane-${tech.id}`}>
                    {/* Tech Column */}
                    <div className="w-48 shrink-0 p-4 border-r border-panel-subtle relative z-10 transition-colors" style={{ background: "var(--sc-panel)" }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-sc-3" />
                        <span className="font-semibold text-sm text-sc truncate">{tech.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-sc-3 uppercase tracking-wider font-semibold">Load</span>
                        <span className={over ? "text-[color:var(--sc-red)] font-bold" : "text-sc-2 font-bold"}>{load}/{cap}h</span>
                      </div>
                      <Progress value={pct} className={`h-1.5 bg-[color:var(--sc-elevated)] ${over ? "[&>div]:bg-[color:var(--sc-red)]" : "[&>div]:bg-[color:var(--sc-blue)]"}`} />
                    </div>
                    
                    {/* Schedule Grid Area */}
                    <div className="flex-1 flex relative transition-colors" style={{ background: "var(--sc-bg)" }}>
                      {/* Vertical grid lines */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {hours.map(h => <div key={`line-${h}`} className="flex-1 border-r border-[color:var(--sc-line-subtle)]" />)}
                      </div>
                      
                      {/* Mock Job Layout */}
                      <div className="relative z-10 p-2 flex gap-2 flex-wrap items-center w-full">
                        {jobs.length === 0 ? (
                          <div className="text-xs text-sc-3 italic w-full text-center py-4">Open Schedule</div>
                        ) : (
                          jobs.map((j) => {
                            const c = customers.find((cc) => cc.id === j.customerId);
                            const widthClass = j.priority === "Emergency" ? "min-w-[200px]" : j.priority === "High" ? "min-w-[160px]" : "min-w-[120px]";
                            
                            return (
                              <button 
                                key={j.id} 
                                onClick={() => navigate(`/work-orders/${j.id}`)} 
                                className={`text-left shadow-sm rounded-md p-2 hover:border-sc-blue/50 hover:shadow-md transition-all group/job ${widthClass}`}
                                style={{ background: "var(--sc-panel-2)", border: "1px solid var(--sc-line)" }}
                                data-testid={`job-chip-${j.id}`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-sc group-hover/job:text-sc-blue transition-colors">{j.number}</span>
                                  <div className={`w-2 h-2 rounded-full ${j.priority === 'Emergency' ? 'bg-[color:var(--sc-red)]' : j.priority === 'High' ? 'bg-[color:var(--sc-orange)]' : 'bg-[color:var(--sc-blue)]'}`} />
                                </div>
                                <div className="text-[10px] font-semibold text-sc-2 truncate">{c?.name}</div>
                                <div className="text-[10px] text-sc-3 mt-0.5 truncate flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 shrink-0" /> {j.timeWindow ?? "Flexible"}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* RoseOS Suggested Assignment Modal/Drawer */}
      <Sheet open={!!selectedUnassigned} onOpenChange={(open) => !open && setSelectedUnassigned(null)}>
        <SheetContent className="w-[400px] sm:w-[540px] border-l border-panel shadow-2xl p-0 flex flex-col" style={{ background: "var(--sc-bg)" }}>
          {selectedWo && (
            <>
              <div className="p-6 text-white relative overflow-hidden shrink-0" style={{ background: "var(--sc-panel)" }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-[color:var(--sc-blue)] opacity-30 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                <SheetHeader className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-sc-3 border-panel text-[10px] font-mono px-2 py-0.5 uppercase tracking-wider" style={{ background: "var(--sc-elevated)" }}>
                      RoseOS Routing
                    </Badge>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide px-2 py-0.5" style={{ color: "var(--sc-orange)", border: "1px solid rgba(255,157,24,0.3)", background: "rgba(255,157,24,0.12)" }}>
                      Needs Human Approval
                    </Badge>
                  </div>
                  <div>
                    <SheetTitle className="text-xl font-bold text-sc mb-1">Suggested Assignment</SheetTitle>
                    <SheetDescription className="text-sc-3 text-sm">
                      Review AI drafted route for {selectedWo.number}
                    </SheetDescription>
                  </div>
                </SheetHeader>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Job Summary */}
                <div className="space-y-1 p-4 rounded-xl border border-panel shadow-sm" style={{ background: "var(--sc-panel-2)" }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-sc-3 mb-2">Target Job</div>
                  <div className="font-semibold text-sc">{selectedWo.number} — {selectedWo.type}</div>
                  <div className="text-sm text-sc-2">{customers.find(c => c.id === selectedWo.customerId)?.name}</div>
                  <div className="flex gap-2 mt-3">
                    <Badge variant="outline" className={priorityClass(selectedWo.priority)}>{selectedWo.priority}</Badge>
                    <Badge variant="secondary" className="text-sc-2 border-panel text-xs" style={{ background: "var(--sc-elevated)" }}>{selectedWo.timeWindow || "ASAP"}</Badge>
                  </div>
                </div>

                {/* AI Recommendation Details */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-sc flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sc-blue" /> Best Match: {bestTech?.name}
                    </h3>
                    <span className="text-xl font-bold text-sc-blue">94%</span>
                  </div>

                  <div className="grid gap-3">
                    <div className="p-3 rounded-lg border border-panel flex items-center justify-between shadow-sm" style={{ background: "var(--sc-panel-2)" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sc-blue" style={{ background: "rgba(67,166,255,0.15)" }}><MapPin className="w-4 h-4" /></div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-sc-3">Logistics</div>
                          <div className="text-sm font-semibold text-sc">12 min drive (4.2 mi)</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]" style={{ background: "rgba(56,212,119,0.1)", color: "var(--sc-green)", borderColor: "rgba(56,212,119,0.3)" }}>Optimal</Badge>
                    </div>

                    <div className="p-3 rounded-lg border border-panel flex items-center justify-between shadow-sm" style={{ background: "var(--sc-panel-2)" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(189,147,249,0.15)", color: "#bd93f9" }}><Wrench className="w-4 h-4" /></div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-sc-3">Skills & Inventory</div>
                          <div className="text-sm font-semibold text-sc">100% Match</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]" style={{ background: "rgba(56,212,119,0.1)", color: "var(--sc-green)", borderColor: "rgba(56,212,119,0.3)" }}>Verified</Badge>
                    </div>

                    <div className="p-3 rounded-lg border border-panel flex items-center justify-between shadow-sm" style={{ background: "var(--sc-panel-2)" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,157,24,0.15)", color: "var(--sc-orange)" }}><Clock className="w-4 h-4" /></div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-sc-3">Workload Impact</div>
                          <div className="text-sm font-semibold text-sc">+2 hrs (Est. Total: 6/8h)</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-sc-2 border-panel text-[10px]" style={{ background: "var(--sc-elevated)" }}>Capacity OK</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-panel shrink-0 flex flex-col gap-3" style={{ background: "var(--sc-panel)" }}>
                <Button 
                  className="w-full text-white shadow-md h-11 text-sm font-semibold blue-glow-soft hover:opacity-90"
                  style={{background:'var(--sc-btn)',border:'1px solid var(--sc-btn-highlight)'}}
                  onClick={() => bestTech && autoAssign(selectedWo.id, bestTech.id)}
                  disabled={!bestTech}
                  data-testid={`button-approve-assign-${selectedWo.id}`}
                >
                  Approve Schedule Draft
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-11 text-sm font-semibold text-sc-2 hover:text-white"
                  style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}}
                  onClick={() => setSelectedUnassigned(null)}
                >
                  Choose Different Tech
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}