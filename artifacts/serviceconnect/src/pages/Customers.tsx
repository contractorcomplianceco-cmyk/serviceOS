import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/ui";
import { Search, Building2 } from "lucide-react";

export default function Customers() {
  const { customers, workOrders, locations } = useAppStore();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const filtered = customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.industry.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Customers</h1>
        <p className="text-muted-foreground">Accounts, requirements, rate rules, and contacts.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." className="pl-9 bg-white" data-testid="input-search-customer" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => {
          const openJobs = workOrders.filter((w) => w.customerId === c.id && !["Closed", "Cancelled", "Invoiced"].includes(w.status)).length;
          const siteCount = locations.filter((l) => l.customerId === c.id).length;
          return (
            <Card key={c.id} className="p-4 cursor-pointer hover:border-primary transition-colors" onClick={() => navigate(`/customers/${c.id}`)} data-testid={`customer-${c.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Building2 className="w-5 h-5 text-primary" /></div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.industry}</div>
                  </div>
                </div>
                <Badge variant="outline" className={c.status === "Active" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-slate-100 text-slate-500"}>{c.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {c.tags.slice(0, 3).map((t) => <Badge key={t} variant="secondary" className="text-[10px] bg-slate-100">{t}</Badge>)}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t text-center">
                <div><div className="text-lg font-bold text-slate-900">{openJobs}</div><div className="text-[10px] text-muted-foreground uppercase">Open Jobs</div></div>
                <div><div className="text-lg font-bold text-slate-900">{siteCount}</div><div className="text-[10px] text-muted-foreground uppercase">Sites</div></div>
                <div><div className={`text-lg font-bold ${c.balance > 0 ? "text-amber-600" : "text-slate-900"}`}>{money(c.balance)}</div><div className="text-[10px] text-muted-foreground uppercase">Balance</div></div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
