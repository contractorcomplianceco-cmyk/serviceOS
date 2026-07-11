import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { money } from "@/lib/ui";
import { Search, AlertTriangle, Package, Warehouse, Truck } from "lucide-react";

export default function Inventory() {
  const { inventory } = useAppStore();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<string>("all");

  const scopes = ["all", "Tampa Shop", "Orlando Shop", "Office", "Truck"];
  const filtered = inventory.filter((i) => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase());
    const matchesScope = scope === "all" || i.location === scope;
    return matchesSearch && matchesScope;
  });
  const lowStock = inventory.filter((i) => i.quantity <= i.reorderPoint);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Inventory</h1>
          <p className="text-muted-foreground">Stock across shops, office, and trucks. RoseOS flags reorder needs.</p>
        </div>
        <Button className="bg-primary text-white" onClick={() => toast({ title: "Reorder drafted", description: `${lowStock.length} low-stock items added to a draft PO for your approval.` })} data-testid="button-reorder">
          Draft Reorder ({lowStock.length})
        </Button>
      </div>

      {lowStock.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <div><span className="font-semibold">{lowStock.length} items below reorder point:</span> {lowStock.map((i) => i.name).join(", ")}</div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." className="pl-9 bg-white" data-testid="input-search-inventory" />
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {scopes.map((s) => (
            <button key={s} onClick={() => setScope(s)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${scope === s ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`} data-testid={`button-scope-${s}`}>{s === "all" ? "All" : s}</button>
          ))}
        </div>
      </div>

      <Card>
        <div className="divide-y">
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-slate-50/50">
            <div className="col-span-4">Item</div>
            <div className="col-span-2">Location</div>
            <div className="col-span-2">On Hand</div>
            <div className="col-span-2">Cost / Bill</div>
            <div className="col-span-2">Status</div>
          </div>
          {filtered.map((i) => {
            const low = i.quantity <= i.reorderPoint;
            const LocIcon = i.location === "Truck" ? Truck : i.location === "Office" ? Package : Warehouse;
            return (
              <div key={i.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center" data-testid={`inventory-${i.id}`}>
                <div className="col-span-4">
                  <div className="font-medium text-sm">{i.name}</div>
                  <div className="text-xs text-muted-foreground">{i.category} · {i.vendor}</div>
                </div>
                <div className="col-span-2 text-sm text-muted-foreground flex items-center gap-1.5"><LocIcon className="w-3.5 h-3.5" /> {i.locationDetail ?? i.location}</div>
                <div className="col-span-2 text-sm"><span className={low ? "font-semibold text-amber-600" : "font-medium"}>{i.quantity}</span> <span className="text-muted-foreground text-xs">/ reorder {i.reorderPoint}</span></div>
                <div className="col-span-2 text-sm">{money(i.cost)} / {money(i.billablePrice)}</div>
                <div className="col-span-2">
                  {i.reservedForJob ? <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">Reserved</Badge>
                    : low ? <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">Low Stock</Badge>
                    : <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">In Stock</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
