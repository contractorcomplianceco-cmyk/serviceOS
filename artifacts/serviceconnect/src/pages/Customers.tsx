import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/ui";
import { Search, Building2, ChevronRight, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Customers() {
  const { customers, workOrders, locations } = useAppStore();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const filtered = customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.industry.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Customers</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Accounts, requirements, rate rules, and contacts.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Search customers..." 
            className="pl-9 bg-white border-slate-200 shadow-sm h-9 text-sm" 
            data-testid="input-search-customer" 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((c) => {
          const openJobs = workOrders.filter((w) => w.customerId === c.id && !["Closed", "Cancelled", "Invoiced"].includes(w.status)).length;
          const siteCount = locations.filter((l) => l.customerId === c.id).length;
          
          return (
            <Card key={c.id} className="border border-slate-200/60 shadow-sm bg-white cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group" onClick={() => navigate(`/customers/${c.id}`)} data-testid={`customer-${c.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors">
                      <Building2 className="w-6 h-6 text-slate-600 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate text-base">{c.name}</div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1 mt-0.5">
                        <Briefcase className="w-3 h-3" /> {c.industry}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-[10px] uppercase font-bold tracking-wider",
                    c.status === "Active" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"
                  )}>
                    {c.status}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-1.5 mb-5 h-6 overflow-hidden">
                  {c.tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px] bg-slate-50 text-slate-600 border border-slate-100 font-medium">
                      {t}
                    </Badge>
                  ))}
                  {c.tags.length > 3 && (
                    <Badge variant="secondary" className="text-[10px] bg-slate-50 text-slate-600 border border-slate-100 font-medium">
                      +{c.tags.length - 3}
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-slate-900 leading-none mb-1">{openJobs}</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Open Jobs</span>
                  </div>
                  <div className="flex flex-col border-l border-slate-100 pl-3">
                    <span className="text-xl font-bold text-slate-900 leading-none mb-1">{siteCount}</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sites</span>
                  </div>
                  <div className="flex flex-col border-l border-slate-100 pl-3">
                    <span className={cn(
                      "text-xl font-bold leading-none mb-1 truncate",
                      c.balance > 0 ? "text-amber-600" : "text-slate-900"
                    )}>{money(c.balance)}</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Balance</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
