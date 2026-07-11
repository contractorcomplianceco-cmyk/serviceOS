import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { shortDate } from "@/lib/ui";
import { Search, HardHat, ShieldCheck } from "lucide-react";

export default function Equipment() {
  const { equipment, customers, locations, workOrders } = useAppStore();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const filtered = equipment.filter((e) => {
    const c = customers.find((cc) => cc.id === e.customerId);
    const q = search.toLowerCase();
    return e.assetName.toLowerCase().includes(q) || e.model.toLowerCase().includes(q) || c?.name.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Equipment & Assets</h1>
        <p className="text-muted-foreground">Customer assets with service history and warranty tracking.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search equipment..." className="pl-9 bg-white" data-testid="input-search-equipment" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((e) => {
          const c = customers.find((cc) => cc.id === e.customerId);
          const loc = locations.find((l) => l.id === e.locationId);
          const related = workOrders.filter((w) => e.relatedWorkOrderIds.includes(w.id));
          const inWarranty = !e.warrantyInfo.toLowerCase().includes("out of") && e.warrantyInfo !== "N/A";
          return (
            <Card key={e.id} data-testid={`equipment-${e.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><HardHat className="w-5 h-5 text-slate-500" /></div>
                    <div>
                      <div className="font-semibold text-slate-900">{e.assetName}</div>
                      <div className="text-xs text-muted-foreground">{e.model} · SN {e.serialNumber}</div>
                    </div>
                  </div>
                  {inWarranty && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"><ShieldCheck className="w-3 h-3 mr-1" />In Warranty</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div><div className="text-xs text-muted-foreground uppercase">Customer</div><button className="text-primary hover:underline" onClick={() => navigate(`/customers/${c?.id}`)}>{c?.name}</button></div>
                  <div><div className="text-xs text-muted-foreground uppercase">Site</div><div>{loc?.name}</div></div>
                  <div><div className="text-xs text-muted-foreground uppercase">Warranty</div><div>{e.warrantyInfo}</div></div>
                  <div><div className="text-xs text-muted-foreground uppercase">Last Serviced</div><div>{shortDate(e.lastServiced)}</div></div>
                </div>
                {related.length > 0 && (
                  <div className="mt-3 pt-3 border-t flex flex-wrap gap-1.5">
                    {related.map((w) => <Badge key={w.id} variant="secondary" className="text-[10px] cursor-pointer" onClick={() => navigate(`/work-orders/${w.id}`)}>{w.number}</Badge>)}
                  </div>
                )}
                {e.notes && <div className="text-xs text-slate-500 mt-2">{e.notes}</div>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
