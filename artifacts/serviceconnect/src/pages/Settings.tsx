import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { useAuth, IS_DEV } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { roleDescription, canViewJobs, canRunJobs, canManageMigration } from "@/lib/permissions";
import { RotateCcw, ShieldCheck, Users, Settings2, UserCircle2, HardHat, FileText, Database, ScrollText, LogOut, RefreshCw, Cpu, Loader2, PlayCircle, ChevronRight } from "lucide-react";
import type { AuditEntityType } from "@/lib/types";
import {
  useListJobs,
  useEnqueueJob,
  getListJobsQueryKey,
  type Job,
} from "@workspace/api-client-react";

const JOB_TYPES = [
  "recommendations.generate",
  "notifications.retry",
  "portal.sync-retry",
  "contracts.reminders",
  "recurrence.generate",
  "migration.process",
  "closeout.transcribe",
  "invoice.pdf",
] as const;

function jobStatusClass(status: string): string {
  switch (status) {
    case "Succeeded":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "Running":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "Pending":
      return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    case "Failed":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
}

export default function Settings() {
  const { users, currentUser, setCurrentUserId, resetData, auditLog } = useAppStore();
  const { logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };
  const [auditFilter, setAuditFilter] = useState<"all" | AuditEntityType>("all");

  const isAdmin = currentUser.role === "Administrator";

  const auditEntityTypes = useMemo(
    () => Array.from(new Set(auditLog.map((e) => e.entityType))).sort() as AuditEntityType[],
    [auditLog]
  );

  const filteredAudit = useMemo(() => {
    const sorted = [...auditLog].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return auditFilter === "all" ? sorted : sorted.filter((e) => e.entityType === auditFilter);
  }, [auditLog, auditFilter]);

  const formatTimestamp = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  // ---- Background jobs -----------------------------------------------------
  const qc = useQueryClient();
  const showJobs = canViewJobs(currentUser.role);
  const canRun = canRunJobs(currentUser.role);
  const showMigration = canManageMigration(currentUser.role);
  const [jobType, setJobType] = useState<string>(JOB_TYPES[0]);

  const jobsQuery = useListJobs(undefined, {
    query: {
      enabled: showJobs,
      queryKey: getListJobsQueryKey(),
      refetchInterval: 8000,
    },
  });
  const jobs: Job[] = jobsQuery.data ?? [];
  const enqueueJob = useEnqueueJob();

  const handleEnqueue = () => {
    enqueueJob.mutate(
      { data: { type: jobType } },
      {
        onSuccess: () => {
          toast({ title: "Job enqueued", description: `"${jobType}" was added to the queue.` });
          qc.invalidateQueries({ queryKey: getListJobsQueryKey() });
        },
        onError: (e) => toast({ title: "Could not enqueue job", description: String(e), variant: "destructive" }),
      },
    );
  };

  const jobResultSummary = (job: Job): string => {
    if (job.lastError) return job.lastError;
    if (job.result && typeof job.result === "object") {
      const entries = Object.entries(job.result as Record<string, unknown>)
        .filter(([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
        .slice(0, 3)
        .map(([k, v]) => `${k}: ${v}`);
      if (entries.length) return entries.join(" · ");
    }
    return "—";
  };

  const guardrails = [
    { label: "AI may auto-schedule jobs", enabled: false, locked: true, desc: "Never automatically assign technicians to jobs." },
    { label: "AI may auto-send customer messages", enabled: false, locked: true, desc: "Never communicate externally without approval." },
    { label: "AI may auto-create invoices", enabled: false, locked: true, desc: "Never generate financial records automatically." },
    { label: "VoiceConnect output saved as draft", enabled: true, locked: true, desc: "All AI extracted data saves as a draft first." },
    { label: "Require supervisor review before billing", enabled: true, locked: false, desc: "Technician closeouts need manager sign-off." },
    { label: "Show RoseOS recommendations", enabled: true, locked: false, desc: "Display AI suggestions in the Intelligence panel." },
  ];

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">Settings</h1>
        <p className="text-sc-2 mt-1 text-sm">
          Roles, permissions, AI guardrails, and system configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Role Simulator */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="sc-panel border-0 bg-[rgba(67,166,255,0.05)] shadow-none">
             <CardContent className="p-6">
               <div className="w-12 h-12 rounded-full text-white flex items-center justify-center mb-4 blue-glow-soft" style={{background:'var(--sc-btn)'}}>
                 <UserCircle2 className="w-6 h-6" />
               </div>
               <h3 className="text-lg font-bold text-sc mb-1">Current Session</h3>
               <div className="text-sm font-medium text-sc-blue mb-3">{currentUser.name} — {currentUser.role}</div>
               <p className="text-sm text-sc-2 mb-6">{roleDescription(currentUser.role)}</p>
               <Button
                 variant="outline"
                 className="w-full mb-6 border-panel text-sc-2 hover:text-white"
                 onClick={handleLogout}
                 data-testid="button-logout-settings"
               >
                 <LogOut className="w-4 h-4 mr-2" /> Sign out
               </Button>
               {IS_DEV && (
                 <div className="space-y-2">
                   <h4 className="text-xs font-bold text-sc-3 uppercase tracking-wider">Switch Role Context <span className="text-sc-blue">(Dev)</span></h4>
                   <div className="space-y-1">
                     {users.map((u) => (
                       <button 
                         key={u.id} 
                         onClick={() => { setCurrentUserId(u.id); toast({ title: "Context switched", description: `Now viewing as ${u.name} (${u.role}).` }); }} 
                         className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between border ${currentUser?.id === u.id ? "bg-[var(--sc-elevated)] text-white font-medium border-panel-strong" : "hover:bg-white/[0.04] bg-transparent border-transparent hover:border-panel text-sc-2"}`} 
                         data-testid={`user-switch-${u.id}`}
                       >
                         <div className="flex items-center gap-2">
                           {u.role.includes("Technician") ? <HardHat className="w-4 h-4 opacity-70" /> : <FileText className="w-4 h-4 opacity-70" />}
                           {u.name}
                         </div>
                         <span className="text-[10px] opacity-70">{u.role.split(' ')[0]}</span>
                       </button>
                     ))}
                   </div>
                 </div>
               )}
             </CardContent>
          </Card>
        </div>

        {/* Right Column: Settings Panels */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="sc-panel overflow-hidden border-0">
            <CardHeader className="py-5 px-6 border-b border-panel" style={{ background: "var(--sc-inner)" }}>
              <CardTitle className="text-lg font-semibold text-sc flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sc-blue" /> RoseOS Guardrails
              </CardTitle>
              <CardDescription className="text-sc-3 mt-1 text-sm">
                Core safety rules that keep AI advisory. Locked rules cannot be bypassed.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-[color:var(--sc-line-subtle)]">
              {guardrails.map((g) => (
                <div key={g.label} className="flex items-start justify-between p-5 hover:bg-white/[0.04] transition-colors">
                  <div className="flex-1 pr-4">
                    <Label className="text-sm font-semibold text-sc flex items-center gap-2 mb-1">
                      {g.label}
                      {g.locked && <Badge variant="outline" className="text-[10px] bg-transparent border-panel-strong text-sc-3 uppercase tracking-wide">Locked</Badge>}
                    </Label>
                    <p className="text-xs text-sc-3">{g.desc}</p>
                  </div>
                  <div className="pt-1">
                    <Switch checked={g.enabled} disabled={g.locked} data-testid={`switch-${g.label}`} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="sc-panel border border-destructive/20 overflow-hidden shadow-none">
            <CardHeader className="bg-[rgba(255,51,72,0.05)] py-4 px-5 border-b border-destructive/20">
              <CardTitle className="text-base font-semibold text-destructive flex items-center gap-2">
                <Database className="w-4 h-4" /> Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-sc mb-1">Reset Sandbox Data</h4>
                  <p className="text-xs text-sc-3 max-w-sm">This will clear all local storage modifications and restore the original seeded demo database.</p>
                </div>
                <Button 
                  variant="outline" 
                  className="border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors bg-transparent" 
                  onClick={() => { resetData(); toast({ title: "Data reset", description: "All demo data restored to defaults." }); navigate("/"); }} 
                  data-testid="button-reset-data"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Factory Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card className="sc-panel overflow-hidden border-0" data-testid="card-audit-trail">
              <CardHeader className="py-5 px-6 border-b border-panel" style={{ background: "var(--sc-inner)" }}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-semibold text-sc flex items-center gap-2">
                      <ScrollText className="w-5 h-5 text-sc-blue" /> Audit Trail
                    </CardTitle>
                    <CardDescription className="text-sc-3 mt-1 text-sm">
                      Every action taken across ServiceConnect, newest first.
                    </CardDescription>
                  </div>
                  <Select value={auditFilter} onValueChange={(v) => setAuditFilter(v as "all" | AuditEntityType)}>
                    <SelectTrigger
                      data-testid="select-audit-filter"
                      className="w-[180px] h-9 text-sm text-sc rounded-lg shrink-0"
                      style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}
                    >
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent className="text-sc" style={{ background: "var(--sc-panel-2)", border: "1px solid var(--sc-line)" }}>
                      <SelectItem value="all" data-testid="audit-filter-all">All types</SelectItem>
                      {auditEntityTypes.map((t) => (
                        <SelectItem key={t} value={t} data-testid={`audit-filter-${t}`}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredAudit.length === 0 ? (
                  <div className="py-12 text-center text-sm text-sc-3" data-testid="text-audit-empty">
                    No audit events recorded yet.
                  </div>
                ) : (
                  <div className="max-h-[520px] overflow-y-auto scrollbar-thin divide-y divide-[color:var(--sc-line-subtle)]">
                    {filteredAudit.map((e) => (
                      <div key={e.id} className="flex items-start gap-3 px-6 py-4 hover:bg-white/[0.04] transition-colors" data-testid={`audit-row-${e.id}`}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}>
                          <ScrollText className="w-4 h-4 text-sc-blue" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-sc">{e.action}</span>
                            <Badge variant="outline" className="text-[10px] bg-transparent border-panel-strong text-sc-3 uppercase tracking-wide">
                              {e.entityType}
                            </Badge>
                          </div>
                          <p className="text-sm text-sc-2 mt-0.5 break-words">{e.summary}</p>
                          <p className="text-xs text-sc-3 mt-1">{e.actor} · {formatTimestamp(e.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {showMigration && (
            <Link href="/settings/migration" data-testid="link-migration-center">
              <Card className="sc-panel overflow-hidden border-0 cursor-pointer hover:bg-white/[0.03] transition-colors" data-testid="card-migration-center">
                <CardContent className="p-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}>
                      <Database className="w-6 h-6 text-sc-blue" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-sc mb-0.5">Data Migration Center</h4>
                      <p className="text-xs text-sc-3 max-w-md">
                        Guided, CSV-based controlled migration from BlueFolder — map columns, validate, import, and roll back safely.
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-sc-3 shrink-0" />
                </CardContent>
              </Card>
            </Link>
          )}

          {showJobs && (
            <Card className="sc-panel overflow-hidden border-0" data-testid="section-background-jobs">
              <CardHeader className="py-5 px-6 border-b border-panel" style={{ background: "var(--sc-inner)" }}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-lg font-semibold text-sc flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-sc-blue" /> Background Jobs
                    </CardTitle>
                    <CardDescription className="text-sc-3 mt-1 text-sm">
                      Durable, DB-backed queue for async and recurring work. Auto-refreshes every 8s.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {canRun && (
                      <>
                        <Select value={jobType} onValueChange={setJobType}>
                          <SelectTrigger
                            data-testid="select-job-type"
                            className="w-[190px] h-9 text-sm text-sc rounded-lg shrink-0"
                            style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}
                          >
                            <SelectValue placeholder="Job type" />
                          </SelectTrigger>
                          <SelectContent className="text-sc" style={{ background: "var(--sc-panel-2)", border: "1px solid var(--sc-line)" }}>
                            {JOB_TYPES.map((t) => (
                              <SelectItem key={t} value={t} data-testid={`job-type-${t}`}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="text-white h-9"
                          style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }}
                          onClick={handleEnqueue}
                          disabled={enqueueJob.isPending}
                          data-testid="button-enqueue-job"
                        >
                          {enqueueJob.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5 mr-1.5" />}
                          Enqueue
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-panel text-sc-2 h-9"
                      onClick={() => jobsQuery.refetch()}
                      disabled={jobsQuery.isFetching}
                      data-testid="button-refresh-jobs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${jobsQuery.isFetching ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {jobsQuery.isLoading ? (
                  <div className="py-12 text-center" data-testid="text-jobs-loading">
                    <Loader2 className="w-5 h-5 text-sc-blue animate-spin mx-auto" />
                  </div>
                ) : jobsQuery.isError ? (
                  <div className="py-12 text-center text-sm text-destructive" data-testid="text-jobs-error">
                    Unable to load background jobs.
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="py-12 text-center text-sm text-sc-3" data-testid="text-jobs-empty">
                    No background jobs recorded yet.
                  </div>
                ) : (
                  <div className="max-h-[520px] overflow-y-auto scrollbar-thin divide-y divide-[color:var(--sc-line-subtle)]">
                    {jobs.map((job) => (
                      <div key={job.id} className="flex items-start gap-3 px-6 py-4 hover:bg-white/[0.04] transition-colors" data-testid={`job-row-${job.id}`}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}>
                          <Cpu className="w-4 h-4 text-sc-blue" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-sc font-mono">{job.type}</span>
                            <Badge variant="outline" className={`text-[10px] uppercase tracking-wide ${jobStatusClass(job.status)}`} data-testid={`job-status-${job.id}`}>
                              {job.status}
                            </Badge>
                            <span className="text-xs text-sc-3">
                              attempt {job.attempts}/{job.maxAttempts}
                            </span>
                            {job.recurringSeconds ? (
                              <Badge variant="outline" className="text-[10px] bg-transparent border-panel-strong text-sc-3 uppercase tracking-wide">
                                every {job.recurringSeconds}s
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-sc-2 mt-1 break-words">{jobResultSummary(job)}</p>
                          <p className="text-xs text-sc-3 mt-1">
                            queued {formatTimestamp(job.createdAt)}
                            {job.finishedAt ? ` · finished ${formatTimestamp(job.finishedAt)}` : job.startedAt ? ` · started ${formatTimestamp(job.startedAt)}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}
