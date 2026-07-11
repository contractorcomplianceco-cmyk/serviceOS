import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { money } from "@/lib/ui";
import { Search, AlertTriangle, Package, Warehouse, Truck, Sparkles, Check, Edit2 } from "lucide-react";

export default function Inventory() {
  const { inventory } = useAppStore();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<string>("all");

  const scopes = ["all", "Tampa Shop", "Orlando Shop", "Office", "Truck", "Technician"];
  
  const filtered = inventory.filter((i) => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase());
    const matchesScope = scope === "all" || i.location === scope;
    return matchesSearch && matchesScope;
  });
  
  const lowStock = inventory.filter((i) => i.quantity <= i.reorderPoint);

  const locGroups = scopes.filter(s => s !== "all").map(loc => ({
    name: loc,
    items: filtered.filter(i => i.location === loc)
  })).filter(g => g.items.length > 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">Inventory</h1>
          <p className="text-sc-2 mt-1 text-sm">Manage stock across all locations and fleet vehicles.</p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-0 bg-transparent shadow-xl overflow-hidden relative" style={{ background: "var(--sc-inner)" }}>
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(67,166,255,0.15), transparent 70%)" }} />
          <div className="absolute inset-0 circuit-texture opacity-20 pointer-events-none" />
          <CardContent className="p-5 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(67,166,255,0.15)" }}>
                <Sparkles className="w-5 h-5 text-sc-blue" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm text-sc">RoseOS Intelligence: Reorder Suggestion</h3>
                  <Badge variant="outline" className="text-[10px] font-mono tracking-wide" style={{ color: "var(--sc-blue)", background: "rgba(67,166,255,0.12)", border: "1px solid rgba(67,166,255,0.3)" }}>
                    94% CONFIDENCE
                  </Badge>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide" style={{ color: "var(--sc-orange)", background: "rgba(255,157,24,0.12)", border: "1px solid rgba(255,157,24,0.3)" }}>
                    Needs Human Approval
                  </Badge>
                </div>
                <p className="text-xs text-sc-2">
                  <span className="font-medium text-sc">{lowStock.length} items</span> have fallen below their configured reorder points. RoseOS has drafted a purchase order to replenish stock to optimal levels.
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" className="text-xs text-white blue-glow-soft hover:opacity-90" style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }} onClick={() => toast({ title: "Reorder Approved", description: `Purchase order submitted for ${lowStock.length} items.` })} data-testid="button-reorder">
                <Check className="w-3.5 h-3.5 mr-1.5" /> Approve Draft PO
              </Button>
              <Button size="sm" variant="outline" className="text-xs text-sc-2 hover:text-white transition-colors" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}>
                <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-sc-3" />
          <Input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Search parts, tools, chemicals..." 
            className="pl-9 text-sc placeholder:text-sc-3 focus-visible:ring-[var(--sc-line-active)] border-none" 
            style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}
            data-testid="input-search-inventory" 
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg p-1" style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}>
          {scopes.map((s) => (
            <button 
              key={s} 
              onClick={() => setScope(s)} 
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${scope === s ? "text-sc shadow-sm" : "text-sc-2 hover:text-sc hover:bg-white/[0.04]"}`} 
              style={scope === s ? { background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" } : {}}
              data-testid={`button-scope-${s.replace(' ', '-')}`}
            >
              {s === "all" ? "All Locations" : s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {locGroups.map(group => {
          const LocIcon = group.name === "Truck" || group.name === "Technician" ? Truck : group.name === "Office" ? Package : Warehouse;
          
          return (
            <Card key={group.name} className="overflow-hidden sc-panel border-none">
              <div className="py-3 px-5 flex items-center gap-2 border-b border-panel-subtle" style={{ background: "var(--sc-panel-2)" }}>
                <LocIcon className="w-4 h-4 text-sc-2" />
                <h3 className="font-semibold text-sc text-sm uppercase tracking-wide">{group.name}</h3>
                <Badge variant="secondary" className="ml-auto font-medium text-sc-2" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}>
                  {group.items.length} Items
                </Badge>
              </div>
              <div className="divide-y divide-[color:var(--sc-line-subtle)]">
                <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-2.5 text-[11px] font-semibold text-sc-3 uppercase tracking-wider bg-white/[0.02]">
                  <div className="col-span-4">Item & Category</div>
                  <div className="col-span-2">Location Detail</div>
                  <div className="col-span-2">Stock Level</div>
                  <div className="col-span-2">Cost / Billable</div>
                  <div className="col-span-2">Status</div>
                </div>
                {group.items.map((i) => {
                  const low = i.quantity <= i.reorderPoint;
                  return (
                    <div key={i.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-5 py-4 items-center hover:bg-white/[0.02] transition-colors" data-testid={`inventory-${i.id}`}>
                      <div className="col-span-1 md:col-span-4 min-w-0">
                        <div className="font-semibold text-sm text-sc truncate">{i.name}</div>
                        <div className="text-xs text-sc-2 mt-0.5 truncate">{i.category} · Vendor: {i.vendor}</div>
                      </div>
                      <div className="col-span-1 md:col-span-2 text-sm text-sc-2 truncate">
                        {i.locationDetail || "Main Storage"}
                      </div>
                      <div className="col-span-1 md:col-span-2 flex flex-row md:flex-col justify-between md:justify-start">
                        <span className="text-xs text-sc-3 md:hidden uppercase font-semibold">Stock:</span>
                        <div className="text-sm">
                          <span className={low ? "font-bold" : "font-medium text-sc"} style={low ? { color: "var(--sc-orange)" } : {}}>{i.quantity}</span> 
                          <span className="text-sc-3 text-xs"> / {i.reorderPoint} (min)</span>
                        </div>
                      </div>
                      <div className="col-span-1 md:col-span-2 flex flex-row md:flex-col justify-between md:justify-start">
                        <span className="text-xs text-sc-3 md:hidden uppercase font-semibold">Price:</span>
                        <div className="text-sm text-sc">
                          {money(i.cost)} <span className="text-sc-3 text-xs">cost</span><br className="hidden md:block"/>
                          <span className="md:mt-0.5 inline-block">{money(i.billablePrice)} <span className="text-sc-3 text-xs">bill</span></span>
                        </div>
                      </div>
                      <div className="col-span-1 md:col-span-2 flex justify-between md:justify-start items-center">
                        <span className="text-xs text-sc-3 md:hidden uppercase font-semibold">Status:</span>
                        <div>
                          {i.reservedForJob ? (
                            <Badge variant="outline" className="text-[11px] px-2 py-0.5" style={{ color: "var(--sc-blue)", background: "rgba(67,166,255,0.12)", border: "1px solid rgba(67,166,255,0.3)" }}>
                              Reserved ({i.reservedForJob})
                            </Badge>
                          ) : low ? (
                            <Badge variant="outline" className="text-[11px] px-2 py-0.5 shadow-sm" style={{ color: "var(--sc-orange)", background: "rgba(255,157,24,0.12)", border: "1px solid rgba(255,157,24,0.3)" }}>
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[11px] px-2 py-0.5" style={{ color: "var(--sc-green)", background: "rgba(56,212,119,0.1)", border: "1px solid rgba(56,212,119,0.25)" }}>
                              Healthy
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
        
        {locGroups.length === 0 && (
          <div className="p-12 text-center text-sc-3 border border-dashed rounded-xl sc-panel border-panel-subtle">
            No inventory items found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
}
