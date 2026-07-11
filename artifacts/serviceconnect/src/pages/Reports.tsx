import { useGetReports, type ReportMetric } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { money } from "@/lib/ui";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, CartesianGrid, Legend
} from "recharts";
import { DollarSign, CheckCircle2, Users, TrendingUp, Briefcase, ShieldAlert, Loader2, Wallet } from "lucide-react";

const COLORS = [
  "#43a6ff", // Primary Blue
  "#38d477", // Success Green
  "#ff9d18", // Warning Amber
  "#75869c", // Muted Slate
  "#a8b7ca", // Secondary
  "#1268f3", // Deep Blue
];

const tooltipStyle = { background: "#0a1b2c", border: "1px solid rgba(127,164,196,0.28)", borderRadius: 8, color: "#f5f8fc" };

function fmtMetric(m: ReportMetric): string {
  if (m.format === "money") return money(m.value);
  return m.value.toLocaleString("en-US");
}

const METRIC_ICONS = [DollarSign, CheckCircle2, Users, TrendingUp];

export default function Reports() {
  const { data, isLoading, isError } = useGetReports();

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]" data-testid="reports-loading">
        <Loader2 className="w-6 h-6 text-sc-blue animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto" data-testid="reports-error">
        <Card className="sc-panel border-none">
          <CardContent className="py-16 text-center text-sc-2">
            Unable to load reports. Please try again.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { operational, financial, disclaimer } = data;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">Reports & Analytics</h1>
          <p className="text-sc-2 mt-1 text-sm">Operational and billing performance derived from live data.</p>
        </div>
      </div>

      {/* Operational KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {operational.metrics.map((m, i) => {
          const Icon = METRIC_ICONS[i % METRIC_ICONS.length];
          return (
            <KPI
              key={m.label}
              label={m.label}
              value={fmtMetric(m)}
              icon={Icon}
              color={COLORS[i % COLORS.length]}
              bg={`${COLORS[i % COLORS.length]}26`}
              testId={`kpi-op-${i}`}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="sc-panel border-none hover:border-panel-strong transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-sc flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-sc-3" /> Work Orders by Status
            </CardTitle>
            <CardDescription className="text-sc-2">Live distribution across the work-order lifecycle.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={operational.workOrdersByStatus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(127,164,196,0.14)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#75869c" }} dy={10} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} tick={{ fill: "#75869c" }} />
                <Tooltip formatter={(v: number) => [v, "Work Orders"]} contentStyle={tooltipStyle} cursor={{ fill: "rgba(127,164,196,0.1)" }} />
                <Bar dataKey="value" fill="#1268f3" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="sc-panel border-none hover:border-panel-strong transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-sc flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-sc-3" /> Work Orders by Priority
            </CardTitle>
            <CardDescription className="text-sc-2">Current priority mix across open and closed jobs.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={operational.workOrdersByPriority} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={70} outerRadius={100} paddingAngle={2} stroke="none" isAnimationActive={false}>
                  {operational.workOrdersByPriority.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "12px", color: "#a8b7ca" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 sc-panel border-none hover:border-panel-strong transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-sc flex items-center gap-2">
              <Users className="w-4 h-4 text-sc-3" /> Technician Utilization
            </CardTitle>
            <CardDescription className="text-sc-2">Open work orders currently assigned per technician.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {operational.techUtilization.length === 0 ? (
              <div className="py-16 text-center text-sm text-sc-3">No open work orders are currently assigned.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={operational.techUtilization} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(127,164,196,0.14)" />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} tick={{ fill: "#75869c" }} />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={120} tick={{ fill: "#f5f8fc", fontWeight: 500 }} />
                  <Tooltip formatter={(v: number) => [v, "Open Jobs"]} contentStyle={tooltipStyle} cursor={{ fill: "rgba(127,164,196,0.1)" }} />
                  <Bar dataKey="value" fill="#38d477" radius={[0, 4, 4, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial section (non-GL) */}
      <div className="flex items-center gap-2 pt-2">
        <Wallet className="w-5 h-5 text-sc-blue" />
        <h2 className="text-xl font-bold text-sc">{financial.label}</h2>
      </div>
      <div className="flex items-start gap-3 rounded-xl p-4 text-xs text-sc-3" style={{ background: "var(--sc-inner)", border: "1px solid var(--sc-line)" }} data-testid="reports-disclaimer">
        <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-sc-orange" />
        <span className="leading-relaxed">{disclaimer}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {financial.metrics.map((m, i) => (
          <KPI
            key={m.label}
            label={m.label}
            value={fmtMetric(m)}
            icon={i === financial.metrics.length - 1 ? Briefcase : DollarSign}
            color={COLORS[i % COLORS.length]}
            bg={`${COLORS[i % COLORS.length]}26`}
            testId={`kpi-fin-${i}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="sc-panel border-none hover:border-panel-strong transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-sc flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sc-3" /> AR Aging
            </CardTitle>
            <CardDescription className="text-sc-2">Outstanding balance by invoice age bucket.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={financial.arAging} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(127,164,196,0.14)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#75869c" }} dy={10} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#75869c" }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: number) => [money(v), "Outstanding"]} contentStyle={tooltipStyle} cursor={{ fill: "rgba(127,164,196,0.1)" }} />
                <Bar dataKey="value" fill="#ff9d18" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="sc-panel border-none hover:border-panel-strong transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-sc flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-sc-3" /> Revenue by Customer
            </CardTitle>
            <CardDescription className="text-sc-2">Top customers by total invoiced amount.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {financial.revenueByCustomer.length === 0 ? (
              <div className="py-16 text-center text-sm text-sc-3">No invoiced revenue recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={financial.revenueByCustomer} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(127,164,196,0.14)" />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#75869c" }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={11} width={130} tick={{ fill: "#f5f8fc", fontWeight: 500 }} />
                  <Tooltip formatter={(v: number) => [money(v), "Invoiced"]} contentStyle={tooltipStyle} cursor={{ fill: "rgba(127,164,196,0.1)" }} />
                  <Bar dataKey="value" fill="#43a6ff" radius={[0, 4, 4, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({ label, value, icon: Icon, color, bg, testId }: { label: string; value: string; icon: any; color: string; bg: string; testId?: string }) {
  return (
    <Card className="sc-panel border-none hover:border-panel-strong transition-colors" data-testid={testId}>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-sc-2 mb-1">{label}</p>
          <p className="text-2xl font-bold text-sc">{value}</p>
        </div>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </CardContent>
    </Card>
  );
}
