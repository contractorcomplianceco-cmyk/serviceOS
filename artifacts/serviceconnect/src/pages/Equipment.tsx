import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { shortDate } from "@/lib/ui";
import { Search, HardHat, ShieldCheck, MapPin, Wrench, AlertCircle, Building2 } from "lucide-react";

export default function Equipment() {
  const { equipment, customers, locations, workOrders } = useAppStore();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const filtered = equipment.filter((e) => {
    const c = customers.find((cc) => cc.id === e.customerId);
    const q = search.toLowerCase();
    return e.assetName.toLowerCase().includes(q) || e.model.toLowerCase().includes(q) || c?.name.toLowerCase().includes(q) || e.serialNumber.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Equipment & Assets</h1>
          <p className="text-slate-500 mt-1 text-sm">Customer assets with service history and warranty tracking.</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          placeholder="Search by asset name, model, serial, or customer..." 
          className="pl-9 bg-white border-slate-200 shadow-sm focus-visible:ring-primary" 
          data-testid="input-search-equipment" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.map((e) => {
          const c = customers.find((cc) => cc.id === e.customerId);
          const loc = locations.find((l) => l.id === e.locationId);
          const related = workOrders.filter((w) => e.relatedWorkOrderIds.includes(w.id));
          const inWarranty = !e.warrantyInfo.toLowerCase().includes("out of") && e.warrantyInfo !== "N/A";
          
          return (
            <Card key={e.id} data-testid={`equipment-${e.id}`} className="border-slate-200/60 shadow-sm bg-white hover:shadow-md transition-shadow overflow-hidden group">
              <div className="h-1 bg-slate-100 w-full" />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                      <HardHat className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-lg leading-tight">{e.assetName}</div>
                      <div className="text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-medium text-slate-700">{e.model}</span>
                        <span className="text-slate-300">|</span>
                        <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">SN: {e.serialNumber}</span>
                      </div>
                    </div>
                  </div>
                  {inWarranty ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[11px] px-2 py-0.5 whitespace-nowrap shadow-sm">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Active Warranty
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[11px] px-2 py-0.5 whitespace-nowrap">
                      Out of Warranty
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      <Building2 className="w-3.5 h-3.5" /> Customer
                    </div>
                    <button 
                      className="text-sm font-medium text-primary hover:underline text-left" 
                      onClick={() => navigate(`/customers/${c?.id}`)}
                    >
                      {c?.name}
                    </button>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-start gap-1">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="truncate">{loc?.name}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      <Wrench className="w-3.5 h-3.5" /> Service Status
                    </div>
                    <div className="text-sm text-slate-900 font-medium">
                      Last: {e.lastServiced ? shortDate(e.lastServiced) : "Never"}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Warranty: <span className="text-slate-700">{e.warrantyInfo}</span>
                    </div>
                  </div>
                </div>

                {e.notes && (
                  <div className="mt-4 text-sm text-slate-600 flex items-start gap-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                    <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{e.notes}</p>
                  </div>
                )}

                {related.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">History:</span>
                    <div className="flex flex-wrap gap-2">
                      {related.map((w) => (
                        <Badge 
                          key={w.id} 
                          variant="secondary" 
                          className="bg-white border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer shadow-sm transition-colors text-[11px]" 
                          onClick={() => navigate(`/work-orders/${w.id}`)}
                        >
                          {w.number}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        
        {filtered.length === 0 && (
          <div className="col-span-1 lg:col-span-2 p-12 text-center text-slate-500 bg-white border border-slate-200 border-dashed rounded-xl">
            No equipment found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
