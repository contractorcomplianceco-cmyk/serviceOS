import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { money } from "@/lib/ui";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, CartesianGrid, Legend
} from "recharts";
import { DollarSign, CheckCircle2, Users, TrendingUp, Briefcase } from "lucide-react";

const COLORS = [
  "#43a6ff", // Primary Blue text-sc-blue equivalent approx
  "#38d477", // Success Green
  "#ff9d18", // Warning Amber
  "#75869c", // Muted Slate
  "#a8b7ca"  // Secondary 
];

export default function Reports() {
  const { workOrders, invoices, users, customers } = useAppStore();

  const byType = Object.entries(
    workOrders.reduce<Record<string, number>>((acc, w) => { acc[w.type] = (acc[w.type] ?? 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const techs = users.filter((u) => u.role === "Technician" || u.role === "Lead Technician");
  const techLoad = techs.map((t) => ({ 
    name: t.name.split(" ")[0], 
    jobs: workOrders.filter((w) => w.assignedTechnicianId === t.id).length 
  })).sort((a, b) => b.jobs - a.jobs);

  const revenue = [
    { name: "Mar", revenue: 41200 }, { name: "Apr", revenue: 38900 }, { name: "May", revenue: 46800 },
    { name: "Jun", revenue: 52300 }, { name: "Jul", revenue: 49100 },
  ];

  const totalBilled = invoices.reduce((s, i) => s + i.amount, 0);
  const completed = workOrders.filter((w) => ["Completed Pending Review", "Ready for Billing", "Invoiced", "Closed"].includes(w.status)).length;
  const activeCustomers = customers.filter((c) => c.status === "Active").length;
  const avgTicket = totalBilled / Math.max(1, invoices.length);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">Reports & Analytics</h1>
          <p className="text-sc-2 mt-1 text-sm">Operational and financial performance at a glance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Total Billed YTD" value={money(totalBilled)} icon={DollarSign} color="var(--sc-blue)" bg="rgba(67,166,255,0.15)" />
        <KPI label="Jobs Completed" value={String(completed)} icon={CheckCircle2} color="var(--sc-green)" bg="rgba(56,212,119,0.15)" />
        <KPI label="Active Customers" value={String(activeCustomers)} icon={Users} color="var(--sc-orange)" bg="rgba(255,157,24,0.15)" />
        <KPI label="Avg Ticket Value" value={money(avgTicket)} icon={TrendingUp} color="#a8b7ca" bg="rgba(168,183,202,0.15)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="sc-panel border-none hover:border-panel-strong transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-sc flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sc-3" /> Revenue Trend
            </CardTitle>
            <CardDescription className="text-sc-2">Monthly billed revenue over the last 5 months.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(127,164,196,0.14)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} tick={{fill: "#75869c"}} dy={10} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{fill: "#75869c"}} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip 
                  formatter={(v: number) => [money(v), "Revenue"]} 
                  contentStyle={{ background: '#0a1b2c', border: '1px solid rgba(127,164,196,0.28)', borderRadius: 8, color: '#f5f8fc' }}
                  cursor={{fill: "rgba(127,164,196,0.1)"}}
                />
                <Bar dataKey="revenue" fill="#1268f3" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="sc-panel border-none hover:border-panel-strong transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-sc flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-sc-3" /> Jobs by Trade Type
            </CardTitle>
            <CardDescription className="text-sc-2">Distribution of work orders across service categories.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie 
                  data={byType} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="45%" 
                  innerRadius={70}
                  outerRadius={100} 
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: '#0a1b2c', border: '1px solid rgba(127,164,196,0.28)', borderRadius: 8, color: '#f5f8fc' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: "#a8b7ca" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 sc-panel border-none hover:border-panel-strong transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-sc flex items-center gap-2">
              <Users className="w-4 h-4 text-sc-3" /> Technician Job Load
            </CardTitle>
            <CardDescription className="text-sc-2">Current and historical job assignments by field technician.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={techLoad} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(127,164,196,0.14)" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} tick={{fill: "#75869c"}} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={80} tick={{fill: "#f5f8fc", fontWeight: 500}} />
                <Tooltip 
                  formatter={(v: number) => [v, "Jobs Assigned"]}
                  contentStyle={{ background: '#0a1b2c', border: '1px solid rgba(127,164,196,0.28)', borderRadius: 8, color: '#f5f8fc' }}
                  cursor={{fill: "rgba(127,164,196,0.1)"}}
                />
                <Bar dataKey="jobs" fill="#38d477" radius={[0, 4, 4, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({ label, value, icon: Icon, color, bg }: { label: string; value: string; icon: any; color: string; bg: string }) {
  return (
    <Card className="sc-panel border-none hover:border-panel-strong transition-colors">
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
