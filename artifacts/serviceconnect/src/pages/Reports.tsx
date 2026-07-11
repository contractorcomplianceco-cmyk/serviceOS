import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { money } from "@/lib/ui";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, CartesianGrid, Legend
} from "recharts";
import { DollarSign, CheckCircle2, Users, TrendingUp, Briefcase } from "lucide-react";

const COLORS = [
  "hsl(221 83% 53%)", // Primary Blue
  "hsl(142 76% 36%)", // Success Green
  "hsl(38 92% 50%)",  // Warning Amber
  "hsl(215 20% 65%)", // Muted Slate
  "hsl(280 65% 60%)"  // Distinct Purple
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Reports & Analytics</h1>
          <p className="text-slate-500 mt-1 text-sm">Operational and financial performance at a glance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Total Billed YTD" value={money(totalBilled)} icon={DollarSign} color="text-blue-600" bg="bg-blue-50" />
        <KPI label="Jobs Completed" value={String(completed)} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
        <KPI label="Active Customers" value={String(activeCustomers)} icon={Users} color="text-amber-600" bg="bg-amber-50" />
        <KPI label="Avg Ticket Value" value={money(avgTicket)} icon={TrendingUp} color="text-indigo-600" bg="bg-indigo-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200/60 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-500" /> Revenue Trend
            </CardTitle>
            <CardDescription>Monthly billed revenue over the last 5 months.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214 32% 91%)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} tick={{fill: "hsl(215 16% 47%)"}} dy={10} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{fill: "hsl(215 16% 47%)"}} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip 
                  formatter={(v: number) => [money(v), "Revenue"]} 
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(214 32% 91%)", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  cursor={{fill: "hsl(210 40% 96%)"}}
                />
                <Bar dataKey="revenue" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-slate-500" /> Jobs by Trade Type
            </CardTitle>
            <CardDescription>Distribution of work orders across service categories.</CardDescription>
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
                >
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(214 32% 91%)", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: "hsl(215 16% 47%)" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-slate-200/60 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" /> Technician Job Load
            </CardTitle>
            <CardDescription>Current and historical job assignments by field technician.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={techLoad} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(214 32% 91%)" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} tick={{fill: "hsl(215 16% 47%)"}} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={80} tick={{fill: "hsl(222 47% 11%)", fontWeight: 500}} />
                <Tooltip 
                  formatter={(v: number) => [v, "Jobs Assigned"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(214 32% 91%)", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  cursor={{fill: "hsl(210 40% 96%)"}}
                />
                <Bar dataKey="jobs" fill="hsl(142 76% 36%)" radius={[0, 4, 4, 0]} maxBarSize={30} />
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
    <Card className="border-slate-200/60 shadow-sm bg-white hover:shadow-md transition-shadow">
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
}
