import { useMemo, useState, Fragment } from "react";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { priorityClass, statusClass } from "@/lib/ui";
import {
  Sparkles, MapPin, AlertTriangle, Clock, Calendar as CalendarIcon, Filter,
  ChevronLeft, ChevronRight, User as UserIcon, CheckCircle2, Wrench, Truck,
  Satellite, ArrowRightLeft, ExternalLink, Repeat, RotateCcw, Rows3, Rows4,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { WorkOrder, User } from "@/lib/types";

type ViewKey = "Today" | "Day" | "3-Day" | "Work Week" | "Full Week";
const VIEWS: ViewKey[] = ["Today", "Day", "3-Day", "Work Week", "Full Week"];

const REGIONS = [
  "All Regions", "Tampa", "Orlando", "Jacksonville", "Ocala", "Daytona", "Miami",
  "Gainesville", "Melbourne", "Fort Myers", "Bradenton/Sarasota", "St. Pete/Clearwater",
  "Brooksville", "Polk", "Vero Beach", "Okeechobee", "Keys", "Georgia",
];

const FIELD_ROLES = new Set(["Technician", "Lead Technician", "Subcontractor"]);
const CLOSED_STATUSES = ["Closed", "Cancelled", "Invoiced"];

function startOfDay(d: Date) {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isWeekend(d: Date) {
  return d.getDay() === 0 || d.getDay() === 6;
}
// Anchor persisted dates to local noon so day-of rendering (which compares local
// Y/M/D) round-trips without a timezone off-by-one when serialized to ISO.
function dayNoonISO(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0).toISOString();
}
function toDateInput(d: Date) {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function fromDateInput(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}
// Only these statuses should be promoted to "Scheduled" on assign/move; anything
// further along (First Trip, On Site, Awaiting Materials, ...) keeps its status.
const SCHEDULABLE_FROM = new Set(["New", "Triage Needed", "Need Scheduled"]);

function rangeFor(view: ViewKey, anchor: Date): Date[] {
  const a = startOfDay(anchor);
  switch (view) {
    case "Today":
    case "Day":
      return [a];
    case "3-Day":
      return [0, 1, 2].map((i) => addDays(a, i));
    case "Work Week": {
      const dow = a.getDay();
      const monday = addDays(a, dow === 0 ? -6 : 1 - dow);
      return [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
    }
    case "Full Week": {
      const sunday = addDays(a, -a.getDay());
      return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(sunday, i));
    }
  }
}

function tripLabel(wo: WorkOrder): { text: string; className: string } | null {
  if (wo.status === "First Trip") return { text: "First Trip", className: "text-[color:var(--sc-orange)]" };
  if (wo.status === "Return Trip Needed" || (wo.trips?.length ?? 0) > 1) {
    return { text: "Return Trip", className: "text-[#bd93f9]" };
  }
  return null;
}

export default function DispatchCalendar() {
  const { workOrders, users, customers, locations, updateWorkOrder } = useAppStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [view, setView] = useState<ViewKey>("Work Week");
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [region, setRegion] = useState<string>("All Regions");
  const [sortBy, setSortBy] = useState<"name" | "workload" | "region">("name");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [selectedUnassigned, setSelectedUnassigned] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ woId: string; techId: string; date: Date } | null>(null);

  const today = startOfDay(new Date());
  const days = useMemo(() => rangeFor(view, anchor), [view, anchor]);

  const regionMatch = (r: string) => region === "All Regions" || r === region;

  const techs = useMemo(() => {
    const list = users.filter((u) => u.active && FIELD_ROLES.has(u.role) && (region === "All Regions" || u.zone === region));
    const sorted = [...list];
    if (sortBy === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "region") sorted.sort((a, b) => (a.zone ?? "").localeCompare(b.zone ?? "") || a.name.localeCompare(b.name));
    if (sortBy === "workload") sorted.sort((a, b) => (b.workloadHours ?? 0) / (b.capacityHours ?? 8) - (a.workloadHours ?? 0) / (a.capacityHours ?? 8));
    return sorted;
  }, [users, region, sortBy]);

  const activeWos = useMemo(
    () => workOrders.filter((w) => !CLOSED_STATUSES.includes(w.status)),
    [workOrders],
  );

  const unassigned = useMemo(
    () => activeWos.filter((w) => !w.assignedTechnicianId && regionMatch(w.region)),
    [activeWos, region],
  );

  const jobsFor = (techId: string, date: Date) =>
    activeWos.filter(
      (w) => w.assignedTechnicianId === techId && regionMatch(w.region) && sameDay(new Date(w.dueDate), date),
    );

  const shiftRange = (dir: number) => {
    const step = view === "Full Week" ? 7 : view === "Work Week" ? 7 : view === "3-Day" ? 3 : 1;
    setAnchor((a) => addDays(a, dir * step));
  };

  const confirmAssign = () => {
    if (!pending) return;
    const wo = workOrders.find((w) => w.id === pending.woId);
    const tech = users.find((u) => u.id === pending.techId);
    const data: Partial<WorkOrder> = {
      assignedTechnicianId: pending.techId,
      dueDate: dayNoonISO(pending.date),
    };
    if (wo && SCHEDULABLE_FROM.has(wo.status)) data.status = "Scheduled";
    updateWorkOrder(pending.woId, data);
    toast({
      title: "Schedule updated",
      description: `${wo?.number} assigned to ${tech?.name} on ${pending.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}. Draft only — approve portal sync separately.`,
    });
    setPending(null);
    setSelectedUnassigned(null);
    setPreviewId(null);
  };

  const rescheduleTo = (woId: string, date: Date) => {
    updateWorkOrder(woId, { dueDate: dayNoonISO(date) });
    toast({ title: "Rescheduled", description: "Work order moved. Persisted with audit trail." });
  };

  const reassignTo = (woId: string, techId: string) => {
    const wo = workOrders.find((w) => w.id === woId);
    const data: Partial<WorkOrder> = { assignedTechnicianId: techId };
    if (wo && SCHEDULABLE_FROM.has(wo.status)) data.status = "Scheduled";
    updateWorkOrder(woId, data);
    toast({ title: "Reassigned", description: "Technician updated; workflow status preserved." });
  };

  const onDropCell = (e: React.DragEvent, techId: string, date: Date) => {
    e.preventDefault();
    const woId = e.dataTransfer.getData("text/wo");
    if (woId) setPending({ woId, techId, date });
  };

  const selectedWo = unassigned.find((w) => w.id === selectedUnassigned);
  const bestTech = techs[0];
  const previewWo = workOrders.find((w) => w.id === previewId);

  const cellPad = density === "compact" ? "p-1.5 gap-1.5" : "p-2 gap-2";
  const cardPad = density === "compact" ? "p-1.5" : "p-2";

  const rangeLabel =
    days.length === 1
      ? days[0].toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
      : `${days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${days[days.length - 1].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <div className="p-6 space-y-4 flex flex-col h-[calc(100vh-4rem)] animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">Dispatch Board</h1>
          <p className="text-sc-3 text-sm mt-1">Team schedule — technicians by day. Drag jobs to reschedule; every change needs approval before it syncs.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View switcher */}
          <div className="flex p-1 rounded-lg" style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}>
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => { setView(v); if (v === "Today") setAnchor(startOfDay(new Date())); }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${view === v ? "bg-[color:var(--sc-elevated)] text-sc shadow" : "text-sc-3 hover:text-sc-2"}`}
                data-testid={`button-view-${v.replace(/\s/g, "-").toLowerCase()}`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Date nav */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" aria-label="Previous range" className="h-9 w-9 text-sc-2" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }} onClick={() => shiftRange(-1)} data-testid="button-prev-range"><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" className="h-9 text-sc-2" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }} onClick={() => setAnchor(startOfDay(new Date()))} data-testid="button-today"><CalendarIcon className="w-4 h-4 mr-2 text-sc-3" /> Today</Button>
            <Button variant="outline" size="icon" aria-label="Next range" className="h-9 w-9 text-sc-2" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }} onClick={() => shiftRange(1)} data-testid="button-next-range"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <span className="text-sm font-semibold text-sc mr-1">{rangeLabel}</span>
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="h-9 w-[180px] text-sc-2" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }} data-testid="select-region"><MapPin className="w-3.5 h-3.5 mr-1.5 text-sc-3" /><SelectValue /></SelectTrigger>
          <SelectContent>{REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="h-9 w-[170px] text-sc-2" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }} data-testid="select-sort"><Filter className="w-3.5 h-3.5 mr-1.5 text-sc-3" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort: Name</SelectItem>
            <SelectItem value="workload">Sort: Workload</SelectItem>
            <SelectItem value="region">Sort: Region</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="h-9 text-sc-2" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }} onClick={() => setDensity((d) => (d === "compact" ? "comfortable" : "compact"))} data-testid="button-density">
          {density === "compact" ? <Rows4 className="w-4 h-4 mr-2" /> : <Rows3 className="w-4 h-4 mr-2" />}
          {density === "compact" ? "Compact" : "Comfortable"}
        </Button>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Unscheduled drawer */}
        <div className="w-72 flex flex-col rounded-xl overflow-hidden shrink-0 sc-panel">
          <div className="p-3 border-b border-panel-subtle flex items-center justify-between" style={{ background: "var(--sc-inner)" }}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-sc flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[color:var(--sc-orange)]" /> Unscheduled</h2>
            <Badge variant="secondary" className="text-[color:var(--sc-orange)]" style={{ background: "rgba(255,157,24,0.1)", border: "1px solid rgba(255,157,24,0.3)" }}>{unassigned.length}</Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            {unassigned.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <CheckCircle2 className="w-10 h-10 text-[color:var(--sc-green)] mb-3" />
                <p className="text-sm font-medium text-sc">All caught up</p>
                <p className="text-xs text-sc-3 mt-1">No unscheduled jobs in {region}.</p>
              </div>
            ) : unassigned.map((wo) => {
              const customer = customers.find((c) => c.id === wo.customerId);
              const loc = locations.find((l) => l.id === wo.locationId);
              return (
                <div
                  key={wo.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/wo", wo.id)}
                  className="rounded-lg p-2.5 hover:border-sc-blue/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
                  style={{ background: "var(--sc-panel-2)", border: "1px solid var(--sc-line)" }}
                  onClick={() => setSelectedUnassigned(wo.id)}
                  data-testid={`unassigned-${wo.id}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-bold text-sc text-sm group-hover:text-sc-blue transition-colors">{wo.number}</span>
                    <Badge variant="outline" className={`${priorityClass(wo.priority)} text-[9px] px-1.5 py-0`}>{wo.priority}</Badge>
                  </div>
                  <div className="text-xs font-semibold text-sc-2 truncate">{customer?.name}</div>
                  <div className="text-[10px] text-sc-3 flex items-center gap-1.5 mt-0.5"><MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{loc?.city}, {loc?.state}</span></div>
                  <div className="mt-2 flex gap-1 flex-wrap">
                    <Badge variant="secondary" className="text-[9px] text-sc-3" style={{ background: "var(--sc-elevated)" }}>{wo.source}</Badge>
                    {wo.materialsFlag && <Badge variant="secondary" className="text-[9px] text-sc-blue" style={{ background: "rgba(67,166,255,0.15)" }}>Materials</Badge>}
                    {wo.priority === "Emergency" && <Badge variant="secondary" className="text-[9px] text-[color:var(--sc-red)]" style={{ background: "rgba(255,90,90,0.15)" }}>Emergency</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 rounded-xl overflow-hidden sc-panel min-w-0">
          <div className="h-full overflow-auto scrollbar-thin">
            <div className="grid min-w-max" style={{ gridTemplateColumns: `200px repeat(${days.length}, minmax(220px, 1fr))` }}>
              {/* Header corner */}
              <div className="sticky top-0 left-0 z-30 p-3 border-r border-b border-panel-subtle flex items-center" style={{ background: "var(--sc-inner)" }}>
                <span className="text-[11px] font-bold text-sc-3 uppercase tracking-wider">Technician</span>
              </div>
              {/* Day headers */}
              {days.map((d) => {
                const isToday = sameDay(d, today);
                return (
                  <div key={d.toISOString()} className={`sticky top-0 z-20 p-3 border-r border-b border-panel-subtle text-center ${isWeekend(d) ? "opacity-90" : ""}`} style={{ background: isToday ? "rgba(67,166,255,0.14)" : isWeekend(d) ? "var(--sc-bg)" : "var(--sc-inner)" }}>
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? "text-sc-blue" : "text-sc-3"}`}>{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
                    <div className={`text-sm font-bold ${isToday ? "text-sc-blue" : "text-sc-2"}`}>{d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                  </div>
                );
              })}

              {/* Tech rows */}
              {techs.length === 0 && (
                <div className="col-span-full p-10 text-center text-sc-3 text-sm">No technicians match this region/filter.</div>
              )}
              {techs.map((tech) => {
                const load = tech.workloadHours ?? 0;
                const cap = tech.capacityHours ?? 8;
                const pct = Math.min(100, (load / cap) * 100);
                const over = load > cap;
                return (
                  <Fragment key={tech.id}>
                    {/* Tech column */}
                    <div className="sticky left-0 z-10 p-3 border-r border-b border-panel-subtle" style={{ background: "var(--sc-panel)" }} data-testid={`tech-lane-${tech.id}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-sc-blue" style={{ background: "rgba(67,166,255,0.15)" }}>{tech.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-sc truncate leading-tight">{tech.name}</div>
                          <div className="text-[10px] text-sc-3 truncate">{tech.role}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mb-1.5 mt-1">
                        {tech.zone && <Badge variant="secondary" className="text-[9px] text-sc-3 px-1.5 py-0" style={{ background: "var(--sc-elevated)" }}><MapPin className="w-2.5 h-2.5 mr-0.5" />{tech.zone}</Badge>}
                        {tech.truckId && <Badge variant="secondary" className="text-[9px] text-sc-3 px-1.5 py-0" style={{ background: "var(--sc-elevated)" }}><Truck className="w-2.5 h-2.5 mr-0.5" />{tech.truckId}</Badge>}
                        <Satellite className={`w-3 h-3 ${tech.gpsConsent ? "text-[color:var(--sc-green)]" : "text-sc-3 opacity-40"}`} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-sc-3 uppercase tracking-wider font-semibold">Load</span>
                        <span className={over ? "text-[color:var(--sc-red)] font-bold" : "text-sc-2 font-bold"}>{load}/{cap}h {over && "⚠"}</span>
                      </div>
                      <Progress value={pct} className={`h-1.5 bg-[color:var(--sc-elevated)] ${over ? "[&>div]:bg-[color:var(--sc-red)]" : "[&>div]:bg-[color:var(--sc-blue)]"}`} />
                    </div>

                    {/* Day cells */}
                    {days.map((d) => {
                      const jobs = jobsFor(tech.id, d);
                      const isToday = sameDay(d, today);
                      return (
                        <div
                          key={d.toISOString()}
                          className={`border-r border-b border-[color:var(--sc-line-subtle)] flex flex-col ${cellPad} transition-colors`}
                          style={{ background: isToday ? "rgba(67,166,255,0.04)" : isWeekend(d) ? "rgba(0,0,0,0.15)" : "var(--sc-bg)" }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => onDropCell(e, tech.id, d)}
                          data-testid={`cell-${tech.id}-${d.toISOString().slice(0, 10)}`}
                        >
                          {jobs.length === 0 ? (
                            <div className="text-[10px] text-sc-3 italic text-center py-3 opacity-50 select-none">Open</div>
                          ) : jobs.map((j) => {
                            const c = customers.find((cc) => cc.id === j.customerId);
                            const loc = locations.find((l) => l.id === j.locationId);
                            const trip = tripLabel(j);
                            return (
                              <button
                                key={j.id}
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData("text/wo", j.id)}
                                onClick={() => setPreviewId(j.id)}
                                className={`text-left rounded-md ${cardPad} hover:border-sc-blue/60 hover:shadow-md transition-all group/job cursor-grab active:cursor-grabbing ${j.priority === "Emergency" ? "ring-1 ring-[color:var(--sc-red)]/40" : ""}`}
                                style={{ background: "var(--sc-panel-2)", border: "1px solid var(--sc-line)" }}
                                data-testid={`job-chip-${j.id}`}
                              >
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className="text-[11px] font-bold text-sc group-hover/job:text-sc-blue transition-colors truncate">{j.number}</span>
                                  <span className="text-[9px] text-sc-3 font-mono shrink-0">{j.timeWindow ?? "Flex"}</span>
                                </div>
                                {j.externalId && <div className="text-[9px] text-sc-3 font-mono truncate">{j.externalId}</div>}
                                <div className="text-[10px] font-semibold text-sc-2 truncate">{c?.name}</div>
                                <div className="text-[9px] text-sc-3 truncate flex items-center gap-1"><MapPin className="w-2.5 h-2.5 shrink-0" />{loc?.city}</div>
                                {density === "comfortable" && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    <span className={`text-[8px] px-1 py-0 rounded border ${statusClass(j.status)}`}>{j.status}</span>
                                    {trip && <span className={`text-[8px] font-bold ${trip.className}`}>{trip.text}</span>}
                                    {j.materialsFlag && <span className="text-[8px] text-sc-blue">Materials</span>}
                                    {j.quoteFlag && <span className="text-[8px] text-[#bd93f9]">Quote</span>}
                                  </div>
                                )}
                                {density === "comfortable" && j.importantNotes && (
                                  <div className="text-[9px] text-[color:var(--sc-orange)] truncate mt-0.5">⚑ {j.importantNotes}</div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick preview (non-navigating) */}
      <QuickPreview
        wo={previewWo}
        onClose={() => setPreviewId(null)}
        techs={techs}
        allUsers={users}
        customers={customers}
        locations={locations}
        onOpen={(id) => navigate(`/work-orders/${id}`)}
        onReassign={reassignTo}
        onReschedule={rescheduleTo}
      />

      {/* RoseOS routing (unscheduled click) */}
      <Sheet open={!!selectedUnassigned} onOpenChange={(open) => !open && setSelectedUnassigned(null)}>
        <SheetContent className="w-[400px] sm:w-[540px] border-l border-panel shadow-2xl p-0 flex flex-col" style={{ background: "var(--sc-bg)" }}>
          {selectedWo && (
            <>
              <div className="p-6 relative overflow-hidden shrink-0" style={{ background: "var(--sc-panel)" }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-[color:var(--sc-blue)] opacity-30 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                <SheetHeader className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-sc-3 border-panel text-[10px] font-mono px-2 py-0.5 uppercase tracking-wider" style={{ background: "var(--sc-elevated)" }}>RoseOS Routing</Badge>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide px-2 py-0.5" style={{ color: "var(--sc-orange)", border: "1px solid rgba(255,157,24,0.3)", background: "rgba(255,157,24,0.12)" }}>Needs Human Approval</Badge>
                  </div>
                  <div>
                    <SheetTitle className="text-xl font-bold text-sc mb-1">Suggested Assignment</SheetTitle>
                    <SheetDescription className="text-sc-3 text-sm">Review the AI-drafted route for {selectedWo.number}</SheetDescription>
                  </div>
                </SheetHeader>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-1 p-4 rounded-xl border border-panel" style={{ background: "var(--sc-panel-2)" }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-sc-3 mb-2">Target Job</div>
                  <div className="font-semibold text-sc">{selectedWo.number} — {selectedWo.type}</div>
                  <div className="text-sm text-sc-2">{customers.find((c) => c.id === selectedWo.customerId)?.name}</div>
                  <div className="flex gap-2 mt-3">
                    <Badge variant="outline" className={priorityClass(selectedWo.priority)}>{selectedWo.priority}</Badge>
                    <Badge variant="secondary" className="text-sc-2 border-panel text-xs" style={{ background: "var(--sc-elevated)" }}>{selectedWo.timeWindow || "ASAP"}</Badge>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-sc flex items-center gap-2"><Sparkles className="w-4 h-4 text-sc-blue" /> Best Match: {bestTech?.name ?? "—"}</h3>
                    <span className="text-xl font-bold text-sc-blue">94%</span>
                  </div>
                  <div className="grid gap-3">
                    <RouteFactor icon={<MapPin className="w-4 h-4" />} tint="rgba(67,166,255,0.15)" color="var(--sc-blue)" label="Logistics" value="12 min drive (4.2 mi)" badge="Optimal" />
                    <RouteFactor icon={<Wrench className="w-4 h-4" />} tint="rgba(189,147,249,0.15)" color="#bd93f9" label="Skills & Inventory" value="100% Match" badge="Verified" />
                    <RouteFactor icon={<Clock className="w-4 h-4" />} tint="rgba(255,157,24,0.15)" color="var(--sc-orange)" label="Workload Impact" value="+2 hrs (Est. 6/8h)" badge="Capacity OK" />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-panel shrink-0 flex flex-col gap-3" style={{ background: "var(--sc-panel)" }}>
                <Button className="w-full text-white shadow-md h-11 text-sm font-semibold blue-glow-soft hover:opacity-90" style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }} onClick={() => bestTech && setPending({ woId: selectedWo.id, techId: bestTech.id, date: startOfDay(new Date(selectedWo.dueDate) > today ? new Date(selectedWo.dueDate) : today) })} disabled={!bestTech} data-testid={`button-approve-assign-${selectedWo.id}`}>Approve Schedule Draft</Button>
                <Button variant="outline" className="w-full h-11 text-sm font-semibold text-sc-2 hover:text-white" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }} onClick={() => setSelectedUnassigned(null)}>Cancel</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Drag-drop / approval confirmation */}
      <Dialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}>
          <DialogHeader>
            <DialogTitle className="text-sc flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-sc-blue" /> Confirm schedule change</DialogTitle>
            <DialogDescription className="text-sc-3">
              {pending && (() => {
                const wo = workOrders.find((w) => w.id === pending.woId);
                const tech = users.find((u) => u.id === pending.techId);
                return <>Assign <span className="font-semibold text-sc-2">{wo?.number}</span> to <span className="font-semibold text-sc-2">{tech?.name}</span> on <span className="font-semibold text-sc-2">{pending.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>. This persists with an audit record and drafts a portal update — nothing sends until you approve it.</>;
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="text-sc-2" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }} onClick={() => setPending(null)}>Cancel</Button>
            <Button className="text-white" style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }} onClick={confirmAssign} data-testid="button-confirm-assign">Confirm & Save Draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RouteFactor({ icon, tint, color, label, value, badge }: { icon: React.ReactNode; tint: string; color: string; label: string; value: string; badge: string }) {
  return (
    <div className="p-3 rounded-lg border border-panel flex items-center justify-between" style={{ background: "var(--sc-panel-2)" }}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: tint, color }}>{icon}</div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-sc-3">{label}</div>
          <div className="text-sm font-semibold text-sc">{value}</div>
        </div>
      </div>
      <Badge variant="outline" className="text-[10px]" style={{ background: "rgba(56,212,119,0.1)", color: "var(--sc-green)", borderColor: "rgba(56,212,119,0.3)" }}>{badge}</Badge>
    </div>
  );
}

function QuickPreview({
  wo, onClose, techs, allUsers, customers, locations, onOpen, onReassign, onReschedule,
}: {
  wo: WorkOrder | undefined;
  onClose: () => void;
  techs: User[];
  allUsers: User[];
  customers: ReturnType<typeof useAppStore>["customers"];
  locations: ReturnType<typeof useAppStore>["locations"];
  onOpen: (id: string) => void;
  onReassign: (woId: string, techId: string) => void;
  onReschedule: (woId: string, date: Date) => void;
}) {
  const customer = wo ? customers.find((c) => c.id === wo.customerId) : undefined;
  const loc = wo ? locations.find((l) => l.id === wo.locationId) : undefined;
  const assignedTech = wo ? allUsers.find((u) => u.id === wo.assignedTechnicianId) : undefined;
  const contact = customer?.contacts?.find((c) => c.primary) ?? customer?.contacts?.[0];
  const mapQuery = loc ? encodeURIComponent(`${loc.address}, ${loc.city}, ${loc.state} ${loc.zip}`) : "";

  return (
    <Sheet open={!!wo} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[520px] border-l border-panel shadow-2xl p-0 flex flex-col" style={{ background: "var(--sc-bg)" }}>
        {wo && (
          <>
            <div className="p-6 shrink-0" style={{ background: "var(--sc-panel)" }}>
              <SheetHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-sc-3 border-panel text-[10px] font-mono uppercase tracking-wider" style={{ background: "var(--sc-elevated)" }}>Quick Preview</Badge>
                  <Badge variant="outline" className={priorityClass(wo.priority)}>{wo.priority}</Badge>
                </div>
                <SheetTitle className="text-xl font-bold text-sc">{wo.number}</SheetTitle>
                <SheetDescription className="text-sc-3 text-sm">
                  {wo.externalId && <span className="font-mono">{wo.externalId} · </span>}{wo.source}{wo.poNumber && <span> · PO {wo.poNumber}</span>}
                </SheetDescription>
              </SheetHeader>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
              <PreviewRow label="Customer" value={customer?.name} />
              <PreviewRow label="Location" value={loc ? `${loc.address}, ${loc.city}, ${loc.state} ${loc.zip}` : undefined} />
              <PreviewRow label="Contact" value={contact ? `${contact.name} · ${contact.phone}` : undefined} />
              <PreviewRow label="Description" value={wo.description} />
              {wo.importantNotes && <PreviewRow label="Tech Note" value={wo.importantNotes} highlight />}
              <div className="grid grid-cols-2 gap-3">
                <PreviewRow label="Status" value={wo.status} />
                <PreviewRow label="Scheduled" value={new Date(wo.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + (wo.timeWindow ? ` · ${wo.timeWindow}` : "")} />
                <PreviewRow label="Materials" value={wo.materialsFlag ? "Needed" : "On hand"} />
                <PreviewRow label="Quote" value={wo.quoteFlag ? "Pending" : "—"} />
                <PreviewRow label="Portal Sync" value={wo.portalSyncStatus} />
                <PreviewRow label="Assigned" value={assignedTech?.name ?? "Unassigned"} />
              </div>

              {/* Inline reassign / reschedule */}
              <div className="pt-2 border-t border-panel-subtle space-y-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-sc-3 mb-1.5">Reassign technician</div>
                  <Select value={wo.assignedTechnicianId ?? ""} onValueChange={(v) => onReassign(wo.id, v)}>
                    <SelectTrigger className="h-9 text-sc-2" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }} data-testid="select-reassign"><SelectValue placeholder="Choose technician" /></SelectTrigger>
                    <SelectContent>{techs.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-sc-3 mb-1.5">Reschedule date</div>
                  <Input type="date" defaultValue={toDateInput(new Date(wo.dueDate))} className="h-9 text-sc-2" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }} onChange={(e) => e.target.value && onReschedule(wo.id, fromDateInput(e.target.value))} data-testid="input-reschedule" />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-panel shrink-0 grid grid-cols-2 gap-2" style={{ background: "var(--sc-panel)" }}>
              <Button className="text-white col-span-2 h-10 text-sm font-semibold" style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }} onClick={() => onOpen(wo.id)} data-testid="button-open-wo"><ExternalLink className="w-4 h-4 mr-2" /> Open Work Order</Button>
              <Button variant="outline" className="h-10 text-sm text-sc-2" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }} asChild><a href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noreferrer" data-testid="button-map"><MapPin className="w-4 h-4 mr-2" /> View Map</a></Button>
              <Button variant="outline" className="h-10 text-sm text-sc-2" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }} onClick={() => onOpen(wo.id)} data-testid="button-return-trip"><Repeat className="w-4 h-4 mr-2" /> Return Trip</Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PreviewRow({ label, value, highlight }: { label: string; value?: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-sc-3">{label}</div>
      <div className={`text-sm ${highlight ? "text-[color:var(--sc-orange)] font-medium" : "text-sc-2"}`}>{value ?? "—"}</div>
    </div>
  );
}
