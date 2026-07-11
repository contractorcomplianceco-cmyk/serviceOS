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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Dispatch Board</h1>
          <p className="text-slate-500 text-sm mt-1">Review AI-assisted routes and balance technician workload.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100/80 border border-slate-200 p-1 rounded-lg">
            {(["Tampa", "Orlando"] as const).map((r) => (
              <button 
                key={r} 
                onClick={() => setRegion(r)} 
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${region === r ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`} 
                data-testid={`button-region-${r}`}
              >
                {r}
              </button>
            ))}
          </div>
          
          <Button variant="outline" className="bg-white border-slate-200 text-slate-700">
            <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" /> Today
          </Button>
          <Button variant="outline" size="icon" className="bg-white border-slate-200">
            <Filter className="w-4 h-4 text-slate-500" />
          </Button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left Drawer: Unassigned Jobs */}
        <div className="w-80 flex flex-col bg-white border border-slate-200/60 shadow-sm rounded-xl overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Unscheduled 
            </h2>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">{unassigned.length}</Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/30 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {unassigned.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3" />
                <p className="text-sm font-medium text-slate-900">All caught up</p>
                <p className="text-xs text-slate-500 mt-1">No unscheduled jobs for {region}.</p>
              </div>
            ) : unassigned.map((wo) => {
              const customer = customers.find((c) => c.id === wo.customerId);
              const loc = locations.find((l) => l.id === wo.locationId);
              return (
                <div 
                  key={wo.id} 
                  className="bg-white border border-slate-200 rounded-lg p-3 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => setSelectedUnassigned(wo.id)}
                  data-testid={`unassigned-${wo.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-bold text-slate-900 text-sm group-hover:text-primary transition-colors">{wo.number}</span>
                    <Badge variant="outline" className={`${priorityClass(wo.priority)} text-[9px] px-1.5 py-0`}>{wo.priority}</Badge>
                  </div>
                  <div className="text-xs font-semibold text-slate-700 truncate">{customer?.name}</div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3 h-3 shrink-0 text-slate-400" /> <span className="truncate">{loc?.city}</span>
                  </div>
                  <div className="mt-3 flex gap-1 flex-wrap">
                    <Badge variant="secondary" className="text-[9px] bg-slate-100 text-slate-500">{wo.source}</Badge>
                    {wo.materialsFlag && <Badge variant="secondary" className="text-[9px] bg-blue-50 text-blue-600">Materials</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Area: Main Calendar Board */}
        <div className="flex-1 bg-white border border-slate-200/60 shadow-sm rounded-xl flex flex-col overflow-hidden relative">
          {/* Calendar Header Row (Time Blocks) */}
          <div className="flex border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10 shrink-0">
            <div className="w-48 shrink-0 p-4 border-r border-slate-100 flex items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Technician</span>
            </div>
            <div className="flex-1 flex min-w-[800px]">
              {hours.map(h => (
                <div key={h} className="flex-1 border-r border-slate-100/50 p-2 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {h === 12 ? '12 PM' : h > 12 ? `${h-12} PM` : `${h} AM`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar Body (Technician Rows) */}
          <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-200">
            <div className="min-w-[800px]">
              {techs.map((tech) => {
                const jobs = jobFor(tech.id);
                const load = tech.workloadHours ?? 0;
                const cap = tech.capacityHours ?? 8;
                const pct = Math.min(100, (load / cap) * 100);
                const over = load > cap;

                return (
                  <div key={tech.id} className="flex border-b border-slate-100 group" data-testid={`tech-lane-${tech.id}`}>
                    {/* Tech Column */}
                    <div className="w-48 shrink-0 p-4 border-r border-slate-100 bg-white relative z-10 group-hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-2 mb-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-sm text-slate-900 truncate">{tech.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-slate-500 uppercase tracking-wider font-semibold">Load</span>
                        <span className={over ? "text-destructive font-bold" : "text-slate-600 font-bold"}>{load}/{cap}h</span>
                      </div>
                      <Progress value={pct} className={`h-1.5 ${over ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"}`} />
                    </div>
                    
                    {/* Schedule Grid Area */}
                    <div className="flex-1 flex relative bg-slate-50/10 group-hover:bg-slate-50/40 transition-colors">
                      {/* Vertical grid lines */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {hours.map(h => <div key={`line-${h}`} className="flex-1 border-r border-slate-100/50" />)}
                      </div>
                      
                      {/* Mock Job Layout (Not strictly mapped to hours to keep demo simple, just stacking horizontally with gaps) */}
                      <div className="relative z-10 p-2 flex gap-2 flex-wrap items-center w-full">
                        {jobs.length === 0 ? (
                          <div className="text-xs text-slate-400 italic w-full text-center py-4">Open Schedule</div>
                        ) : (
                          jobs.map((j) => {
                            const c = customers.find((cc) => cc.id === j.customerId);
                            // Visual width hack based on priority to simulate different job lengths in UI
                            const widthClass = j.priority === "Emergency" ? "min-w-[200px]" : j.priority === "High" ? "min-w-[160px]" : "min-w-[120px]";
                            
                            return (
                              <button 
                                key={j.id} 
                                onClick={() => navigate(`/work-orders/${j.id}`)} 
                                className={`text-left bg-white border border-slate-200 shadow-sm rounded-md p-2 hover:border-primary/50 hover:shadow-md transition-all group/job ${widthClass}`}
                                data-testid={`job-chip-${j.id}`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-slate-900 group-hover/job:text-primary transition-colors">{j.number}</span>
                                  <div className={`w-2 h-2 rounded-full ${j.priority === 'Emergency' ? 'bg-destructive' : j.priority === 'High' ? 'bg-amber-500' : 'bg-primary'}`} />
                                </div>
                                <div className="text-[10px] font-semibold text-slate-600 truncate">{c?.name}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center gap-1">
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
        <SheetContent className="w-[400px] sm:w-[540px] border-l border-slate-200 shadow-2xl p-0 flex flex-col bg-slate-50">
          {selectedWo && (
            <>
              <div className="bg-slate-900 p-6 text-white relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/30 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                <SheetHeader className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700 text-[10px] font-mono px-2 py-0.5 uppercase tracking-wider">
                      RoseOS Routing
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30 bg-amber-400/10 uppercase tracking-wide px-2 py-0.5">
                      Needs Human Approval
                    </Badge>
                  </div>
                  <div>
                    <SheetTitle className="text-xl font-bold text-white mb-1">Suggested Assignment</SheetTitle>
                    <SheetDescription className="text-slate-400 text-sm">
                      Review AI drafted route for {selectedWo.number}
                    </SheetDescription>
                  </div>
                </SheetHeader>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Job Summary */}
                <div className="space-y-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Target Job</div>
                  <div className="font-semibold text-slate-900">{selectedWo.number} — {selectedWo.type}</div>
                  <div className="text-sm text-slate-600">{customers.find(c => c.id === selectedWo.customerId)?.name}</div>
                  <div className="flex gap-2 mt-3">
                    <Badge variant="outline" className={priorityClass(selectedWo.priority)}>{selectedWo.priority}</Badge>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 text-xs">{selectedWo.timeWindow || "ASAP"}</Badge>
                  </div>
                </div>

                {/* AI Recommendation Details */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" /> Best Match: {bestTech?.name}
                    </h3>
                    <span className="text-xl font-bold text-primary">94%</span>
                  </div>

                  <div className="grid gap-3">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><MapPin className="w-4 h-4" /></div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Logistics</div>
                          <div className="text-sm font-semibold text-slate-900">12 min drive (4.2 mi)</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Optimal</Badge>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600"><Wrench className="w-4 h-4" /></div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Skills & Inventory</div>
                          <div className="text-sm font-semibold text-slate-900">100% Match</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Verified</Badge>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600"><Clock className="w-4 h-4" /></div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Workload Impact</div>
                          <div className="text-sm font-semibold text-slate-900">+2 hrs (Est. Total: 6/8h)</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px]">Capacity OK</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white border-t border-slate-200 shrink-0 flex flex-col gap-3">
                <Button 
                  className="w-full bg-primary text-white hover:bg-primary/90 shadow-md h-11 text-sm font-semibold"
                  onClick={() => bestTech && autoAssign(selectedWo.id, bestTech.id)}
                  disabled={!bestTech}
                  data-testid={`button-approve-assign-${selectedWo.id}`}
                >
                  Approve Schedule Draft
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-11 text-sm font-semibold text-slate-600 bg-white border-slate-200 hover:bg-slate-50"
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

