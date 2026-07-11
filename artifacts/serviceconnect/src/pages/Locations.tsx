import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Locations</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Service sites with access notes and region assignment.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Search locations..." 
            className="pl-9 bg-white border-slate-200 shadow-sm h-9 text-sm" 
            data-testid="input-search-location" 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((l) => {
          const c = customers.find((cc) => cc.id === l.customerId);
          const openJobs = workOrders.filter((w) => w.locationId === l.id && !["Closed", "Cancelled", "Invoiced"].includes(w.status)).length;
          
          return (
            <Card key={l.id} className="border border-slate-200/60 shadow-sm bg-white group hover:border-primary/50 transition-colors" data-testid={`location-${l.id}`}>
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors">
                      <MapPin className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-base truncate">{l.name}</div>
                      <button className="text-xs font-semibold text-primary hover:underline uppercase tracking-wider mt-0.5 text-left truncate w-full" onClick={() => navigate(`/customers/${c?.id}`)}>
                        {c?.name}
                      </button>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500 border-slate-200 uppercase font-bold tracking-wider shrink-0 ml-2">
                    {l.region}
                  </Badge>
                </div>
                
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-600 leading-relaxed">
                    {l.address}<br />
                    {l.city}, {l.state} {l.zip}
                  </div>
                  
                  {l.notes && (
                    <div className="text-xs font-medium text-slate-500 mt-4 bg-slate-50 rounded-md px-3 py-2 border border-slate-100">
                      {l.notes}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  {openJobs > 0 ? (
                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-xs font-bold px-2 py-0.5">
                      {openJobs} Open Job{openJobs > 1 ? "s" : ""}
                    </Badge>
                  ) : (
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">No active jobs</span>
                  )}
                  
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary group-hover:translate-x-1 transition-transform">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
