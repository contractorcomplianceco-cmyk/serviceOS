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
import { Search, Repeat, Plus, Play, Pause, SkipForward, Ban, Zap, CalendarClock } from "lucide-react";
import {
  useListRecurrenceSchedules,
  useCreateRecurrenceSchedule,
  usePreviewRecurrence,
  useRunRecurrence,
  usePauseRecurrence,
  useResumeRecurrence,
  useEndRecurrence,
  useSkipRecurrence,
  getListRecurrenceSchedulesQueryKey,
  getListWorkOrdersQueryKey,
  RecurrenceScheduleInputFrequency,
  type RecurrenceSchedule,
  type RecurrenceScheduleInputFrequency as Freq,
} from "@workspace/api-client-react";

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

  const schedules = schedulesQuery.data ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListRecurrenceSchedulesQueryKey() });
    qc.invalidateQueries({ queryKey: getListWorkOrdersQueryKey() });
  };

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "Unknown customer";

  const [createOpen, setCreateOpen] = useState(false);
  const [fCustomerId, setFCustomerId] = useState("");
  const [fLocationId, setFLocationId] = useState("");
  const [fTitle, setFTitle] = useState("");
  const [fFrequency, setFFrequency] = useState<Freq>("Monthly");
  const [fInterval, setFInterval] = useState("1");
  const [fStartDate, setFStartDate] = useState("");
  const [fEndDate, setFEndDate] = useState("");
  const [fDescription, setFDescription] = useState("");
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
    setPreviewDates([]);
  };

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
    </div>
  );
}
