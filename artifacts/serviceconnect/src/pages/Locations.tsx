import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Search } from "lucide-react";

export default function Locations() {
  const { locations, customers, workOrders } = useAppStore();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const filtered = locations.filter((l) => {
    const c = customers.find((cc) => cc.id === l.customerId);
    const q = search.toLowerCase();
    return l.name.toLowerCase().includes(q) || l.city.toLowerCase().includes(q) || c?.name.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Locations</h1>
        <p className="text-muted-foreground">Service sites with access notes and region assignment.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search locations..." className="pl-9 bg-white" data-testid="input-search-location" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((l) => {
          const c = customers.find((cc) => cc.id === l.customerId);
          const openJobs = workOrders.filter((w) => w.locationId === l.id && !["Closed", "Cancelled", "Invoiced"].includes(w.status)).length;
          return (
            <Card key={l.id} data-testid={`location-${l.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><MapPin className="w-4 h-4 text-slate-500" /></div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{l.name}</div>
                      <button className="text-xs text-primary hover:underline" onClick={() => navigate(`/customers/${c?.id}`)}>{c?.name}</button>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{l.region}</Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-3">{l.address}</div>
                <div className="text-sm text-muted-foreground">{l.city}, {l.state} {l.zip}</div>
                {l.notes && <div className="text-xs text-slate-500 mt-2 bg-slate-50 rounded px-2 py-1.5">{l.notes}</div>}
                {openJobs > 0 && <div className="text-xs text-amber-600 mt-2 font-medium">{openJobs} open job{openJobs > 1 ? "s" : ""}</div>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
