import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { AIRecommendation } from "@/lib/types";
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
} from "recharts";
import {
  ShieldAlert, CalendarClock, DollarSign, AlertCircle, ArrowUp, Wrench, Navigation,
  Check, Edit2, Sparkles, MapPin, Clock, Route, Locate, Layers, Plus, Minus,
  ArrowRight, FileText, UserPlus, Timer, FilePlus, Upload, Mic, Activity, ShieldCheck,
} from "lucide-react";

const donutData = [
  { name: "On Track", value: 62, color: "#38d477" },
  { name: "In Progress", value: 38, color: "#1268f3" },
  { name: "At Risk", value: 18, color: "#ff9d18" },
  { name: "On Hold", value: 10, color: "#75869c" },
];
const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

const complianceTrend = [
  { m: "Apr 20", v: 66 }, { m: "Apr 27", v: 69 }, { m: "May 4", v: 71 },
  { m: "May 11", v: 70 }, { m: "May 18", v: 72 },
];

export default function TodayDashboard() {
  const { recommendations, workOrders, invoices, currentUser, dismissRecommendation } = useAppStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const emergency = workOrders.filter((w) => w.priority === "Emergency" && w.status !== "Closed").length;
  const needScheduled = workOrders.filter((w) => w.status === "Need Scheduled" || w.status === "New").length;
  const readyBilling = workOrders.filter((w) => w.status === "Ready for Billing" || w.status === "Completed Pending Review").length;
  const pastDue = invoices.filter((i) => i.status === "Past Due").length;
  const activeJobs = workOrders.filter((w) => ["Scheduled", "First Trip", "On Site"].includes(w.status));

  const featured =
    workOrders.find((w) => w.priority === "Emergency" && w.status !== "Closed") ??
    workOrders.find((w) => ["Scheduled", "First Trip", "On Site"].includes(w.status)) ??
    workOrders[0];

  const kpis = [
    { label: "Emergency Jobs", value: emergency, delta: "25% vs yesterday", icon: ShieldAlert, accent: "var(--sc-red)", tone: "red", to: "/work-orders" },
    { label: "Need Scheduled", value: needScheduled, delta: "15% vs yesterday", icon: CalendarClock, accent: "var(--sc-orange)", tone: "orange", to: "/dispatch" },
    { label: "Ready for Billing", value: readyBilling, delta: "10% vs yesterday", icon: DollarSign, accent: "var(--sc-blue)", tone: "blue", to: "/billing" },
    { label: "Past Due AR", value: pastDue, delta: "$12,450", icon: AlertCircle, accent: "var(--sc-red)", tone: "red", to: "/accounting" },
  ];

  const toneStyles: Record<string, { text: string; sq: string }> = {
    red: { text: "var(--sc-red)", sq: "rgba(255,51,72,0.12)" },
    orange: { text: "var(--sc-orange)", sq: "rgba(255,157,24,0.12)" },
    blue: { text: "var(--sc-blue)", sq: "rgba(67,166,255,0.12)" },
  };

  const handleAct = (rec: AIRecommendation) => {
    if (rec.type === "Scheduling" && rec.relatedEntityId) return navigate(`/work-orders/${rec.relatedEntityId}`);
    if (rec.type === "Overload") return navigate("/dispatch");
    if (rec.type === "Billing" && rec.relatedEntityId) return navigate(`/work-orders/${rec.relatedEntityId}`);
    if (rec.type === "AR") return navigate("/accounting");
    if (rec.type === "Inventory") return navigate("/inventory");
    if (rec.type === "Document") return navigate("/documents");
    if (rec.relatedEntityId?.startsWith("wo")) return navigate(`/work-orders/${rec.relatedEntityId}`);
    toast({ title: `${rec.primaryAction} drafted`, description: "RoseOS drafted this action for your review." });
  };

  const quickActions = [
    { label: "New Work Order", help: "Create service request", icon: FileText, onClick: () => navigate("/work-orders") },
    { label: "New Customer", help: "Add customer record", icon: UserPlus, onClick: () => navigate("/customers") },
    { label: "Time Entry", help: "Log technician time", icon: Timer, onClick: () => toast({ title: "Time Entry", description: "Time-entry drawer would open here." }) },
    { label: "New Invoice", help: "Create invoice", icon: FilePlus, onClick: () => navigate("/billing") },
    { label: "Upload Document", help: "Store & organize", icon: Upload, onClick: () => navigate("/documents") },
    { label: "VoiceConnect", help: "Voice to workflow", icon: Mic, onClick: () => toast({ title: "VoiceConnect", description: "Voice closeout capture is available in the technician app." }) },
  ];

  return (
    <div className="px-6 py-6 space-y-5 animate-in fade-in duration-500 min-h-full flex flex-col">
      {/* Heading */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-none font-bold tracking-tight text-sc" data-testid="text-page-title">
            Operations Cockpit
          </h1>
          <p className="text-sc-2 mt-2 text-sm">
            Good morning, {currentUser.name.split(" ")[0]}. System online. All telemetry is nominal.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/work-orders")}
            data-testid="button-all-work-orders"
            className="h-10 px-4 rounded-lg text-sm font-medium text-sc-2 hover:text-white transition-colors flex items-center gap-2"
            style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}
          >
            <Wrench className="w-4 h-4" /> All Work Orders
          </button>
          <button
            onClick={() => navigate("/dispatch")}
            data-testid="button-dispatch-board"
            className="h-10 px-4 rounded-lg text-sm font-semibold text-white transition-colors flex items-center gap-2 blue-glow-soft"
            style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }}
          >
            <Navigation className="w-4 h-4" /> Dispatch Board
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <button
            key={k.label}
            onClick={() => navigate(k.to)}
            data-testid={`stat-${k.label}`}
            className="relative text-left rounded-xl overflow-hidden p-5 transition-all hover:-translate-y-0.5 group"
            style={{ background: "linear-gradient(160deg, var(--sc-panel-2), var(--sc-panel))", border: "1px solid var(--sc-line)" }}
          >
            <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: k.accent }} />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-medium text-sc-2">{k.label}</p>
                <p className="text-[42px] leading-tight font-bold text-sc mt-1">{k.value}</p>
                <p className="flex items-center gap-1 text-xs mt-1" style={{ color: k.tone === "blue" ? "var(--sc-blue)" : k.accent }}>
                  <ArrowUp className="w-3 h-3" /> {k.delta}
                </p>
              </div>
              <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: toneStyles[k.tone].sq }}>
                <k.icon className="w-5 h-5" style={{ color: toneStyles[k.tone].text }} />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* LEFT */}
        <div className="xl:col-span-2 space-y-5">
          {/* Priority Dispatch Overview */}
          <section className="sc-panel overflow-hidden">
            <div className="flex items-center justify-between px-5 h-14 border-b border-panel-subtle">
              <h2 className="text-[15px] font-semibold text-sc flex items-center gap-2">
                <Navigation className="w-4 h-4 text-sc-blue" /> Priority Dispatch Overview
              </h2>
              <span className="text-xs font-medium text-sc-2 px-2.5 py-1 rounded-md" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}>
                Active Jobs Today: {activeJobs.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Details */}
              <div className="p-5 flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--sc-red)", boxShadow: "0 0 8px rgba(255,51,72,0.6)" }} />
                  <span className="text-sm font-semibold text-sc">{featured?.number} · {featured?.source}</span>
                </div>
                <p className="text-sm text-sc-2 mt-2 leading-relaxed line-clamp-2">{featured?.description}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[11px] px-2 py-0.5 rounded-md text-sc-2" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}>
                    {featured?.status}
                  </span>
                  {featured?.assignedTechnicianId && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1" style={{ color: "var(--sc-green)", background: "rgba(56,212,119,0.1)", border: "1px solid rgba(56,212,119,0.25)" }}>
                      <Check className="w-3 h-3" /> Tech Assigned
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  <div>
                    <div className="flex items-center gap-1.5 text-[22px] font-bold text-sc"><Clock className="w-4 h-4 text-sc-blue" />8 min</div>
                    <div className="text-[11px] text-sc-3 mt-0.5">ETA</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[22px] font-bold text-sc"><Route className="w-4 h-4 text-sc-blue" />0.6 mi</div>
                    <div className="text-[11px] text-sc-3 mt-0.5">Distance</div>
                  </div>
                  <div>
                    <div className="text-[22px] font-bold" style={{ color: featured?.priority === "Emergency" ? "var(--sc-red)" : featured?.priority === "High" ? "var(--sc-orange)" : "var(--sc-blue)" }}>
                      {featured?.priority}
                    </div>
                    <div className="text-[11px] text-sc-3 mt-0.5">Priority</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-auto pt-5">
                  <button
                    onClick={() => featured && navigate(`/work-orders/${featured.id}`)}
                    data-testid="button-view-job"
                    className="h-9 px-4 rounded-lg text-sm font-semibold text-white flex items-center gap-2 blue-glow-soft"
                    style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }}
                  >
                    <Navigation className="w-4 h-4" /> View Job
                  </button>
                  <button
                    onClick={() => navigate("/dispatch")}
                    data-testid="button-reassign"
                    className="h-9 px-4 rounded-lg text-sm font-medium text-sc-2 hover:text-white flex items-center gap-2 transition-colors"
                    style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}
                  >
                    <Wrench className="w-4 h-4" /> Reassign
                  </button>
                </div>
              </div>

              {/* Map */}
              <div className="relative min-h-[260px] border-l border-panel-subtle overflow-hidden">
                <MapPanel />
              </div>
            </div>
          </section>

          {/* Analytics row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Jobs by Status */}
            <section className="sc-panel p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[15px] font-semibold text-sc flex items-center gap-2"><Activity className="w-4 h-4 text-sc-blue" /> Jobs by Status</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative w-[130px] h-[130px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} dataKey="value" innerRadius={44} outerRadius={62} paddingAngle={2} stroke="none">
                        {donutData.map((d) => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-sc">{donutTotal}</span>
                    <span className="text-[11px] text-sc-3">Total</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {donutData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-sc-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} /> {d.name}
                      </span>
                      <span className="text-sc font-medium">{d.value} <span className="text-sc-3">({Math.round((d.value / donutTotal) * 100)}%)</span></span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => navigate("/reports")} data-testid="link-full-report" className="text-xs text-sc-blue hover:underline mt-3 flex items-center gap-1">
                View full report <ArrowRight className="w-3 h-3" />
              </button>
            </section>

            {/* Compliance Risk */}
            <section className="sc-panel p-5">
              <h3 className="text-[15px] font-semibold text-sc flex items-center gap-2 mb-3"><ShieldCheck className="w-4 h-4 text-sc-blue" /> Compliance Risk Overview</h3>
              <div className="flex items-end gap-4">
                <div>
                  <div className="text-[11px] text-sc-3">Overall Risk Score</div>
                  <div className="text-[40px] leading-none font-bold text-sc mt-1">72<span className="text-lg text-sc-3 font-medium"> /100</span></div>
                  <div className="text-sm font-medium mt-1" style={{ color: "var(--sc-orange)" }}>Moderate Risk</div>
                  <div className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--sc-green)" }}>
                    <ArrowUp className="w-3 h-3 rotate-180" /> 6 pts vs last month
                  </div>
                </div>
                <div className="flex-1 h-[100px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={complianceTrend} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                      <XAxis dataKey="m" tick={{ fontSize: 9, fill: "#75869c" }} axisLine={false} tickLine={false} />
                      <YAxis hide domain={[50, 100]} />
                      <Tooltip
                        contentStyle={{ background: "#0a1b2c", border: "1px solid rgba(127,164,196,0.28)", borderRadius: 8, fontSize: 12, color: "#f5f8fc" }}
                        labelStyle={{ color: "#a8b7ca" }}
                      />
                      <Line type="monotone" dataKey="v" stroke="#43a6ff" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <button onClick={() => navigate("/reports")} data-testid="link-compliance-hub" className="text-xs text-sc-blue hover:underline mt-3 flex items-center gap-1">
                View compliance hub <ArrowRight className="w-3 h-3" />
              </button>
            </section>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.map((a) => (
              <button
                key={a.label}
                onClick={a.onClick}
                data-testid={`quick-${a.label}`}
                className="flex flex-col items-start gap-2 p-4 rounded-xl text-left transition-all hover:-translate-y-0.5 group"
                style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}
              >
                <a.icon className="w-5 h-5 text-sc-blue" />
                <div>
                  <div className="text-[13px] font-semibold text-sc leading-tight">{a.label}</div>
                  <div className="text-[11px] text-sc-3 mt-0.5">{a.help}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT — RoseOS Intelligence */}
        <div className="xl:col-span-1">
          <section className="sc-panel circuit-texture overflow-hidden flex flex-col xl:h-[calc(100vh-9.5rem)] xl:sticky xl:top-5" style={{ background: "var(--sc-inner)" }}>
            <div className="px-5 pt-5 pb-4 border-b border-panel-subtle relative">
              <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(67,166,255,0.12), transparent 70%)" }} />
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-sc flex items-center gap-2"><Sparkles className="w-4 h-4 text-sc-blue" /> RoseOS Intelligence</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md" style={{ color: "var(--sc-blue)", background: "rgba(67,166,255,0.12)", border: "1px solid rgba(67,166,255,0.3)" }}>
                  {recommendations.length} Pending
                </span>
              </div>
              <p className="text-xs text-sc-3 mt-1.5">AI-assisted operational drafts requiring human approval.</p>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
              {recommendations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 opacity-70 py-10">
                  <Check className="w-9 h-9" style={{ color: "var(--sc-green)" }} />
                  <p className="text-sm text-sc-2">All clear. No operational anomalies detected.</p>
                </div>
              ) : (
                recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    data-testid={`rec-${rec.id}`}
                    className="rounded-lg p-4 transition-colors"
                    style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono font-semibold tracking-wide" style={{ color: "var(--sc-blue)" }}>
                        {rec.confidence}% CONFIDENCE
                      </span>
                      {rec.needsApproval && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ color: "var(--sc-orange)", background: "rgba(255,157,24,0.12)", border: "1px solid rgba(255,157,24,0.3)" }}>
                          Needs Human Approval
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-sc leading-snug">{rec.title}</h3>
                    <p className="text-xs text-sc-2 mt-1 leading-relaxed">{rec.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleAct(rec)}
                        data-testid={`button-approve-${rec.id}`}
                        className="h-8 flex-1 rounded-md text-xs font-semibold text-white flex items-center justify-center gap-1.5"
                        style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }}
                      >
                        <Check className="w-3.5 h-3.5" /> Approve Draft
                      </button>
                      <button
                        onClick={() => handleAct(rec)}
                        data-testid={`button-edit-${rec.id}`}
                        className="h-8 px-3 rounded-md text-xs font-medium text-sc-2 hover:text-white flex items-center gap-1 transition-colors"
                        style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => dismissRecommendation(rec.id)}
                        data-testid={`button-snooze-${rec.id}`}
                        className="h-8 px-2 rounded-md text-xs font-medium text-sc-3 hover:text-sc-2 transition-colors"
                      >
                        Snooze
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-panel-subtle">
              <button onClick={() => navigate("/intelligence")} data-testid="link-all-recommendations" className="text-xs font-medium text-sc-blue hover:underline flex items-center gap-1">
                View all recommendations <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 mt-auto text-center">
        <p className="text-[10px] tracking-[0.22em] uppercase text-sc-3">
          Built for compliance. Designed for excellence. Powered by RoseOS Intelligence.
        </p>
      </div>
    </div>
  );
}

function MapPanel() {
  return (
    <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 60% 40%, #0d2033, #06101d)" }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice">
        {/* street grid */}
        <g stroke="rgba(127,164,196,0.16)" strokeWidth="1">
          <line x1="0" y1="55" x2="400" y2="55" />
          <line x1="0" y1="120" x2="400" y2="120" />
          <line x1="0" y1="190" x2="400" y2="190" />
          <line x1="70" y1="0" x2="70" y2="260" />
          <line x1="170" y1="0" x2="170" y2="260" />
          <line x1="280" y1="0" x2="280" y2="260" />
        </g>
        {/* diagonal roads */}
        <g stroke="rgba(127,164,196,0.10)" strokeWidth="1">
          <line x1="0" y1="230" x2="400" y2="70" />
          <line x1="120" y1="260" x2="400" y2="150" />
        </g>
        {/* route line */}
        <path d="M75 205 L75 120 L170 120 L170 60 L280 60" fill="none" stroke="#43a6ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 6px rgba(67,166,255,0.7))" }} />
        {/* origin */}
        <circle cx="75" cy="205" r="7" fill="#1268f3" stroke="#0a1b2c" strokeWidth="3" />
        <circle cx="75" cy="205" r="12" fill="none" stroke="rgba(67,166,255,0.4)" strokeWidth="1.5" />
        {/* destination pin */}
        <g transform="translate(280,60)">
          <path d="M0 -16 C 8 -16 12 -10 12 -4 C 12 4 0 14 0 14 C 0 14 -12 4 -12 -4 C -12 -10 -8 -16 0 -16 Z" fill="#ff3348" stroke="#0a1b2c" strokeWidth="1.5" style={{ filter: "drop-shadow(0 0 6px rgba(255,51,72,0.6))" }} />
          <circle cx="0" cy="-4" r="4" fill="#fff" />
        </g>
        {/* street labels */}
        <text x="200" y="48" fill="#75869c" fontSize="8" letterSpacing="1" transform="rotate(-2 200 48)">RACE TRACK RD</text>
        <text x="90" y="150" fill="#75869c" fontSize="8" letterSpacing="1" transform="rotate(-32 90 150)">UNIVERSITY BLVD</text>
        <text x="290" y="200" fill="#75869c" fontSize="8" letterSpacing="1">S CLARK AVE</text>
      </svg>

      {/* controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        {[Locate, Layers].map((Icon, i) => (
          <button key={i} className="w-8 h-8 rounded-md flex items-center justify-center text-sc-2 hover:text-white transition-colors" style={{ background: "rgba(10,27,44,0.85)", border: "1px solid var(--sc-line)" }}>
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>
      <div className="absolute bottom-3 right-3 flex flex-col rounded-md overflow-hidden" style={{ border: "1px solid var(--sc-line)" }}>
        <button className="w-8 h-8 flex items-center justify-center text-sc-2 hover:text-white transition-colors" style={{ background: "rgba(10,27,44,0.85)" }}><Plus className="w-4 h-4" /></button>
        <button className="w-8 h-8 flex items-center justify-center text-sc-2 hover:text-white transition-colors border-t border-panel" style={{ background: "rgba(10,27,44,0.85)" }}><Minus className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
