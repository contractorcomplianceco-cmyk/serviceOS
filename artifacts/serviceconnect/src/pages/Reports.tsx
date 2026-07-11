import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { money } from "@/lib/ui";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";

const COLORS = ["hsl(221 83% 53%)", "hsl(142 76% 36%)", "hsl(38 92% 50%)", "hsl(0 84% 60%)", "hsl(215 20% 55%)"];

export default function Reports() {
  const { workOrders, invoices, users, customers } = useAppStore();

  const byType = Object.entries(
    workOrders.reduce<Record<string, number>>((acc, w) => { acc[w.type] = (acc[w.type] ?? 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const techs = users.filter((u) => u.role === "Technician" || u.role === "Lead Technician");
  const techLoad = techs.map((t) => ({ name: t.name.split(" ")[0], jobs: workOrders.filter((w) => w.assignedTechnicianId === t.id).length }));

  const revenue = [
    { name: "Mar", revenue: 41200 }, { name: "Apr", revenue: 38900 }, { name: "May", revenue: 46800 },
    { name: "Jun", revenue: 52300 }, { name: "Jul", revenue: 49100 },
  ];

  const totalBilled = invoices.reduce((s, i) => s + i.amount, 0);
  const completed = workOrders.filter((w) => ["Completed Pending Review", "Ready for Billing", "Invoiced", "Closed"].includes(w.status)).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Reports & Analytics</h1>
        <p className="text-muted-foreground">Operational and financial performance at a glance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI label="Total Billed" value={money(totalBilled)} />
        <KPI label="Jobs Completed" value={String(completed)} />
        <KPI label="Active Customers" value={String(customers.filter((c) => c.status === "Active").length)} />
        <KPI label="Avg Ticket" value={money(totalBilled / Math.max(1, invoices.length))} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Bar dataKey="revenue" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Jobs by Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.name} (${e.value})`}>
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Technician Job Load</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={techLoad} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={70} />
                <Tooltip />
                <Bar dataKey="jobs" fill="hsl(142 76% 36%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">{label}</div><div className="text-2xl font-bold text-slate-900 mt-1">{value}</div></CardContent></Card>
  );
}
