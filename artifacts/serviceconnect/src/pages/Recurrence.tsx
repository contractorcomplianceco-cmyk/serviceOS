import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { shortDate } from "@/lib/ui";
import { Search, Repeat, Plus, Play, Pause, SkipForward, Ban, Zap, CalendarClock, X, CalendarCog } from "lucide-react";
import {
  useListRecurrenceSchedules,
  useCreateRecurrenceSchedule,
  usePreviewRecurrence,
  useRunRecurrence,
  usePauseRecurrence,
  useResumeRecurrence,
  useEndRecurrence,
  useSkipRecurrence,
  useRescheduleRecurrence,
  getListRecurrenceSchedulesQueryKey,
  getListWorkOrdersQueryKey,
  RecurrenceScheduleInputFrequency,
  type RecurrenceSchedule,
  type RecurrenceScheduleInputFrequency as Freq,
} from "@workspace/api-client-react";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function scheduleStatusClass(status: string): string {
  switch (status) {
    case "Active":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "Paused":
      return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    case "Ended":
    case "Completed":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  }
}

const FREQUENCIES = Object.values(RecurrenceScheduleInputFrequency);

export default function Recurrence() {
  const { customers, locations } = useAppStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const schedulesQuery = useListRecurrenceSchedules();
  const createSchedule = useCreateRecurrenceSchedule();
  const previewRecurrence = usePreviewRecurrence();
  const runRecurrence = useRunRecurrence();
  const pause = usePauseRecurrence();
  const resume = useResumeRecurrence();
  const end = useEndRecurrence();
  const skip = useSkipRecurrence();
  const reschedule = useRescheduleRecurrence();

  const schedules = schedulesQuery.data ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListRecurrenceSchedulesQueryKey() });
    qc.invalidateQueries({ queryKey: getListWorkOrdersQueryKey() });
  };

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "Unknown customer";

  const [createOpen, setCreateOpen] = useState(false);
  const [rescheduleFor, setRescheduleFor] = useState<RecurrenceSchedule | null>(null);
  const [rNextRun, setRNextRun] = useState("");

  const handleReschedule = () => {
    if (!rescheduleFor || !rNextRun) {
      toast({ title: "Date required", description: "Pick the next run date." });
      return;
    }
    reschedule.mutate(
      { id: rescheduleFor.id, data: { nextRunDate: rNextRun } },
      {
        onSuccess: () => {
          toast({ title: "Next run rescheduled", description: `${rescheduleFor.title} now runs ${shortDate(rNextRun)}.` });
          invalidate();
          setRescheduleFor(null);
          setRNextRun("");
        },
        onError: () => toast({ title: "Reschedule failed", description: "Please try again." }),
      },
    );
  };
  const [fCustomerId, setFCustomerId] = useState("");
  const [fLocationId, setFLocationId] = useState("");
  const [fTitle, setFTitle] = useState("");
  const [fFrequency, setFFrequency] = useState<Freq>("Monthly");
  const [fInterval, setFInterval] = useState("1");
  const [fStartDate, setFStartDate] = useState("");
  const [fEndDate, setFEndDate] = useState("");
  const [fDescription, setFDescription] = useState("");
  const [fWeekdays, setFWeekdays] = useState<number[]>([]);
  const [fMonthDays, setFMonthDays] = useState<number[]>([]);
  const [fBlackoutDates, setFBlackoutDates] = useState<string[]>([]);
  const [fBlackoutInput, setFBlackoutInput] = useState("");
  const [fOccurrenceLimit, setFOccurrenceLimit] = useState("");
  const [previewDates, setPreviewDates] = useState<string[]>([]);

  const customerLocations = locations.filter((l) => l.customerId === fCustomerId);

  const resetCreate = () => {
    setFCustomerId("");
    setFLocationId("");
    setFTitle("");
    setFFrequency("Monthly");
    setFInterval("1");
    setFStartDate("");
    setFEndDate("");
    setFDescription("");
    setFWeekdays([]);
    setFMonthDays([]);
    setFBlackoutDates([]);
    setFBlackoutInput("");
    setFOccurrenceLimit("");
    setPreviewDates([]);
  };

  const toggleWeekday = (day: number) =>
    setFWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
  const toggleMonthDay = (day: number) =>
    setFMonthDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
  const addBlackout = () => {
    if (!fBlackoutInput) return;
    setFBlackoutDates((prev) => (prev.includes(fBlackoutInput) ? prev : [...prev, fBlackoutInput].sort()));
    setFBlackoutInput("");
  };
  const removeBlackout = (d: string) => setFBlackoutDates((prev) => prev.filter((x) => x !== d));

  // Only send the recurrence controls that apply to the chosen frequency, so a
  // stale weekday/monthDay selection can't leak into an unrelated cadence.
  const recurrenceExtras = () => ({
    weekdays: fFrequency === "Weekly" && fWeekdays.length ? fWeekdays : undefined,
    monthDays:
      (fFrequency === "Monthly" || fFrequency === "Quarterly" || fFrequency === "SemiAnnual" || fFrequency === "Annual") &&
      fMonthDays.length
        ? fMonthDays
        : undefined,
    blackoutDates: fBlackoutDates.length ? fBlackoutDates : undefined,
    occurrenceLimit: fOccurrenceLimit ? Number(fOccurrenceLimit) : undefined,
  });

  const handlePreview = () => {
    if (!fStartDate) {
      toast({ title: "Start date required", description: "Pick a start date to preview occurrences." });
      return;
    }
    previewRecurrence.mutate(
      {
        data: {
          frequency: fFrequency,
          interval: fInterval ? Number(fInterval) : 1,
          startDate: fStartDate,
          endDate: fEndDate || undefined,
          count: 6,
          ...recurrenceExtras(),
        },
      },
      {
        onSuccess: (res) => setPreviewDates(res.dates),
        onError: () => toast({ title: "Preview failed", description: "Check the schedule settings." }),
      },
    );
  };

  const handleCreate = () => {
    if (!fCustomerId || !fLocationId || !fTitle.trim() || !fStartDate) {
      toast({ title: "Missing information", description: "Customer, location, title, and start date are required." });
      return;
    }
    createSchedule.mutate(
      {
        data: {
          customerId: fCustomerId,
          locationId: fLocationId,
          title: fTitle.trim(),
          frequency: fFrequency,
          interval: fInterval ? Number(fInterval) : 1,
          startDate: fStartDate,
          endDate: fEndDate || undefined,
          description: fDescription.trim() || undefined,
          ...recurrenceExtras(),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Schedule created", description: `${fTitle.trim()} is now active.` });
          invalidate();
          setCreateOpen(false);
          resetCreate();
        },
        onError: () => toast({ title: "Could not create schedule", description: "Please try again." }),
      },
    );
  };

  const handleRun = () => {
    runRecurrence.mutate(undefined, {
      onSuccess: (res) => {
        toast({
          title: "Recurrence worker ran",
          description: `${res.generated} draft work order(s) generated across ${res.schedulesProcessed} schedule(s).`,
        });
        invalidate();
      },
      onError: () => toast({ title: "Worker run failed", description: "Please try again." }),
    });
  };

  const doAction = (fn: { mutate: (v: { id: string }, o: { onSuccess: () => void; onError: () => void }) => void }, id: string, label: string) => {
    fn.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: `Schedule ${label}`, description: "" });
          invalidate();
        },
        onError: () => toast({ title: "Action failed", description: "Please try again." }),
      },
    );
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return schedules.filter(
      (s) => s.title.toLowerCase().includes(q) || customerName(s.customerId).toLowerCase().includes(q),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedules, search, customers]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">Recurring Work</h1>
          <p className="text-sc-2 mt-1 text-sm">Recurrence schedules that generate draft work orders automatically.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" className="border-panel text-sc-2" onClick={handleRun} disabled={runRecurrence.isPending} data-testid="button-run-worker">
            <Zap className="w-4 h-4 mr-2" /> Run Worker
          </Button>
          <Button className="text-white blue-glow-soft" style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }} onClick={() => setCreateOpen(true)} data-testid="button-create-schedule">
            <Plus className="w-4 h-4 mr-2" /> New Schedule
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sc-3" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search schedules…" className="pl-9 bg-card border-panel text-sc" data-testid="input-search-schedules" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((s) => (
          <Card key={s.id} className="bg-card border-panel" data-testid={`card-schedule-${s.id}`}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-sc-blue shrink-0" />
                    <span className="font-semibold text-sc">{s.title}</span>
                  </div>
                  <p className="text-sm text-sc-2 mt-1">{customerName(s.customerId)}</p>
                </div>
                <Badge variant="outline" className={scheduleStatusClass(s.status)}>{s.status}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm pt-1">
                <div>
                  <div className="text-sc-3 text-xs uppercase tracking-wide">Cadence</div>
                  <div className="text-sc">Every {s.interval} · {s.frequency}</div>
                </div>
                <div>
                  <div className="text-sc-3 text-xs uppercase tracking-wide">Next run</div>
                  <div className="text-sc">{s.nextRunDate ? shortDate(s.nextRunDate) : "—"}</div>
                </div>
                <div>
                  <div className="text-sc-3 text-xs uppercase tracking-wide">Generated</div>
                  <div className="text-sc">{s.occurrencesGenerated}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-panel">
                {s.status === "Active" ? (
                  <Button size="sm" variant="outline" className="border-panel text-sc-2" onClick={() => doAction(pause, s.id, "paused")} disabled={pause.isPending} data-testid={`button-pause-${s.id}`}>
                    <Pause className="w-3.5 h-3.5 mr-1.5" /> Pause
                  </Button>
                ) : s.status === "Paused" ? (
                  <Button size="sm" variant="outline" className="border-panel text-sc-2" onClick={() => doAction(resume, s.id, "resumed")} disabled={resume.isPending} data-testid={`button-resume-${s.id}`}>
                    <Play className="w-3.5 h-3.5 mr-1.5" /> Resume
                  </Button>
                ) : null}
                {s.status === "Active" && (
                  <Button size="sm" variant="outline" className="border-panel text-sc-2" onClick={() => doAction(skip, s.id, "skipped next")} disabled={skip.isPending} data-testid={`button-skip-${s.id}`}>
                    <SkipForward className="w-3.5 h-3.5 mr-1.5" /> Skip Next
                  </Button>
                )}
                {(s.status === "Active" || s.status === "Paused") && (
                  <Button size="sm" variant="outline" className="border-panel text-sc-2" onClick={() => { setRescheduleFor(s); setRNextRun(s.nextRunDate ?? ""); }} disabled={reschedule.isPending} data-testid={`button-reschedule-${s.id}`}>
                    <CalendarCog className="w-3.5 h-3.5 mr-1.5" /> Reschedule
                  </Button>
                )}
                {s.status !== "Ended" && s.status !== "Completed" && (
                  <Button size="sm" variant="outline" className="border-destructive/30 text-destructive" onClick={() => doAction(end, s.id, "ended")} disabled={end.isPending} data-testid={`button-end-${s.id}`}>
                    <Ban className="w-3.5 h-3.5 mr-1.5" /> End
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-sc-3" data-testid="empty-schedules">
          {schedulesQuery.isLoading ? "Loading schedules…" : "No recurrence schedules found."}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreate(); }}>
        <DialogContent className="max-w-lg bg-card border-panel text-sc">
          <DialogHeader className="border-b border-panel pb-4">
            <DialogTitle className="text-lg text-sc flex items-center gap-2">
              <Repeat className="w-4 h-4 text-sc-blue" /> New Recurrence Schedule
            </DialogTitle>
            <DialogDescription className="text-sc-3">Draft work orders are generated for each occurrence — never auto-scheduled.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sc-2">Customer</Label>
              <Select value={fCustomerId} onValueChange={(v) => { setFCustomerId(v); setFLocationId(""); }}>
                <SelectTrigger className="bg-elevated border-panel text-sc" data-testid="select-schedule-customer"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sc-2">Location</Label>
              <Select value={fLocationId} onValueChange={setFLocationId} disabled={!fCustomerId}>
                <SelectTrigger className="bg-elevated border-panel text-sc" data-testid="select-schedule-location"><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>{customerLocations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sc-2">Title</Label>
              <Input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="Quarterly filter replacement" className="bg-elevated border-panel text-sc" data-testid="input-schedule-title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sc-2">Frequency</Label>
                <Select value={fFrequency} onValueChange={(v) => setFFrequency(v as Freq)}>
                  <SelectTrigger className="bg-elevated border-panel text-sc" data-testid="select-schedule-frequency"><SelectValue /></SelectTrigger>
                  <SelectContent>{FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sc-2">Interval</Label>
                <Input type="number" min="1" value={fInterval} onChange={(e) => setFInterval(e.target.value)} className="bg-elevated border-panel text-sc" data-testid="input-schedule-interval" />
              </div>
            </div>
            {fFrequency === "Weekly" && (
              <div className="space-y-2">
                <Label className="text-sc-2">Days of week</Label>
                <div className="flex flex-wrap gap-1.5" data-testid="weekday-picker">
                  {WEEKDAY_LABELS.map((lbl, i) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => toggleWeekday(i)}
                      className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${fWeekdays.includes(i) ? "bg-blue-500/15 text-blue-500 border-blue-500/30" : "border-panel text-sc-2 hover:bg-elevated"}`}
                      data-testid={`weekday-${i}`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-sc-3">Leave empty to use the start date's weekday.</p>
              </div>
            )}
            {(fFrequency === "Monthly" || fFrequency === "Quarterly" || fFrequency === "SemiAnnual" || fFrequency === "Annual") && (
              <div className="space-y-2">
                <Label className="text-sc-2">Days of month</Label>
                <div className="flex flex-wrap gap-1" data-testid="monthday-picker">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleMonthDay(d)}
                      className={`w-7 h-7 rounded-md text-xs border transition-colors ${fMonthDays.includes(d) ? "bg-blue-500/15 text-blue-500 border-blue-500/30" : "border-panel text-sc-2 hover:bg-elevated"}`}
                      data-testid={`monthday-${d}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-sc-3">Leave empty to use the start date's day-of-month.</p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sc-2">Blackout dates (optional)</Label>
              <div className="flex gap-2">
                <Input type="date" value={fBlackoutInput} onChange={(e) => setFBlackoutInput(e.target.value)} className="bg-elevated border-panel text-sc" data-testid="input-blackout-date" />
                <Button type="button" variant="outline" className="border-panel text-sc-2 shrink-0" onClick={addBlackout} data-testid="button-add-blackout">Add</Button>
              </div>
              {fBlackoutDates.length > 0 && (
                <div className="flex flex-wrap gap-1.5" data-testid="blackout-list">
                  {fBlackoutDates.map((d) => (
                    <Badge key={d} variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1 pr-1" data-testid={`blackout-${d}`}>
                      {shortDate(d)}
                      <button type="button" onClick={() => removeBlackout(d)} className="hover:text-amber-800" data-testid={`remove-blackout-${d}`}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-sc-3">Occurrences landing on these dates are skipped.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sc-2">Occurrence limit (optional)</Label>
              <Input type="number" min="1" value={fOccurrenceLimit} onChange={(e) => setFOccurrenceLimit(e.target.value)} placeholder="No limit" className="bg-elevated border-panel text-sc" data-testid="input-occurrence-limit" />
              <p className="text-xs text-sc-3">Auto-completes the schedule after this many draft work orders.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sc-2">Start date</Label>
                <Input type="date" value={fStartDate} onChange={(e) => setFStartDate(e.target.value)} className="bg-elevated border-panel text-sc" data-testid="input-schedule-start" />
              </div>
              <div className="space-y-2">
                <Label className="text-sc-2">End date (optional)</Label>
                <Input type="date" value={fEndDate} onChange={(e) => setFEndDate(e.target.value)} className="bg-elevated border-panel text-sc" data-testid="input-schedule-end" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sc-2">Description (optional)</Label>
              <Textarea value={fDescription} onChange={(e) => setFDescription(e.target.value)} placeholder="Scope of recurring work…" className="bg-elevated border-panel text-sc" data-testid="input-schedule-description" />
            </div>
            <div className="rounded-lg border border-panel p-3 bg-elevated/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-sc-2 flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5 text-sc-blue" /> Preview occurrences</span>
                <Button size="sm" variant="outline" className="border-panel text-sc-2" onClick={handlePreview} disabled={previewRecurrence.isPending} data-testid="button-preview-schedule">Preview</Button>
              </div>
              {previewDates.length > 0 && (
                <div className="flex flex-wrap gap-1.5" data-testid="preview-dates">
                  {previewDates.map((d) => (
                    <Badge key={d} variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">{shortDate(d)}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-panel text-sc-2" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="text-white" style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }} onClick={handleCreate} disabled={createSchedule.isPending} data-testid="button-submit-schedule">
              Create Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rescheduleFor !== null} onOpenChange={(open) => { if (!open) { setRescheduleFor(null); setRNextRun(""); } }}>
        <DialogContent className="max-w-sm bg-card border-panel text-sc">
          <DialogHeader className="border-b border-panel pb-4">
            <DialogTitle className="text-lg text-sc flex items-center gap-2">
              <CalendarCog className="w-4 h-4 text-sc-blue" /> Reschedule Next Run
            </DialogTitle>
            <DialogDescription className="text-sc-3">
              Move the next draft-generation date for {rescheduleFor?.title}. Existing drafts are untouched.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-sc-2">Next run date</Label>
            <Input type="date" value={rNextRun} onChange={(e) => setRNextRun(e.target.value)} className="bg-elevated border-panel text-sc" data-testid="input-reschedule-date" />
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-panel text-sc-2" onClick={() => { setRescheduleFor(null); setRNextRun(""); }}>Cancel</Button>
            <Button className="text-white" style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }} onClick={handleReschedule} disabled={reschedule.isPending} data-testid="button-submit-reschedule">
              Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
