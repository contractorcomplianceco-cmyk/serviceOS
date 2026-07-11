import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { money } from "@/lib/ui";
import type { InventoryItem } from "@/lib/types";
import {
  Search, Package, Warehouse, Truck, Sparkles, Check, Edit2,
  ArrowLeftRight, Bookmark, SlidersHorizontal, ClipboardCheck, ShoppingCart,
} from "lucide-react";

const LOCATIONS = ["Tampa Shop", "Orlando Shop", "Office", "Truck", "Technician"];

export default function Inventory() {
  const {
    inventory, purchaseRequests, currentUser,
    transferInventory, reserveInventory, adjustInventory, cycleCountInventory,
    createPurchaseRequest, approvePurchaseRequest, receivePurchaseRequest,
  } = useAppStore();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<string>("all");
  const [actionItem, setActionItem] = useState<InventoryItem | null>(null);
  const [busy, setBusy] = useState(false);

  const scopes = ["all", ...LOCATIONS];

  // Derived on-hand from the ledger; fall back to the seed quantity for items
  // that predate the transaction backend.
  const onHandOf = (i: InventoryItem) => i.onHand ?? i.quantity;
  const availableOf = (i: InventoryItem) => i.available ?? onHandOf(i);

  const filtered = inventory.filter((i) => {
    const matchesSearch =
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase());
    const matchesScope = scope === "all" || i.location === scope;
    return matchesSearch && matchesScope;
  });

  const lowStock = inventory.filter((i) => onHandOf(i) <= i.reorderPoint);

  const locGroups = scopes
    .filter((s) => s !== "all")
    .map((loc) => ({ name: loc, items: filtered.filter((i) => i.location === loc) }))
    .filter((g) => g.items.length > 0);

  const pendingPRs = purchaseRequests.filter((p) => p.status !== "Received" && p.status !== "Cancelled");

  const approveDraftPO = async () => {
    setBusy(true);
    let created = 0;
    for (const i of lowStock) {
      const qty = Math.max(1, (i.reorderPoint * 2) - onHandOf(i));
      const ok = await createPurchaseRequest({
        itemId: i.id,
        quantity: qty,
        location: i.location,
        vendor: i.vendor,
        reason: `Reorder — on-hand ${onHandOf(i)} at/below reorder point ${i.reorderPoint}`,
      });
      if (ok) created += 1;
    }
    setBusy(false);
    toast({
      title: created ? "Reorder Requests Created" : "Could Not Create Requests",
      description: created
        ? `${created} purchase request${created === 1 ? "" : "s"} submitted for approval.`
        : "You may not have permission to create purchase requests.",
      variant: created ? undefined : "destructive",
    });
  };

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
              <Button size="sm" disabled={busy} className="text-xs text-white blue-glow-soft hover:opacity-90" style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }} onClick={approveDraftPO} data-testid="button-reorder">
                <Check className="w-3.5 h-3.5 mr-1.5" /> Approve Draft PO
              </Button>
              <Button size="sm" variant="outline" className="text-xs text-sc-2 hover:text-white transition-colors" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}>
                <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {pendingPRs.length > 0 && (
        <Card className="overflow-hidden sc-panel border-none" data-testid="panel-purchase-requests">
          <div className="py-3 px-5 flex items-center gap-2 border-b border-panel-subtle" style={{ background: "var(--sc-panel-2)" }}>
            <ShoppingCart className="w-4 h-4 text-sc-2" />
            <h3 className="font-semibold text-sc text-sm uppercase tracking-wide">Purchase Requests</h3>
            <Badge variant="secondary" className="ml-auto font-medium text-sc-2" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}>
              {pendingPRs.length} Open
            </Badge>
          </div>
          <div className="divide-y divide-[color:var(--sc-line-subtle)]">
            {pendingPRs.map((p) => (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3" data-testid={`pr-${p.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-sc truncate">{p.itemName ?? p.itemId} · {p.quantity} units</div>
                  <div className="text-xs text-sc-2 mt-0.5 truncate">
                    Requested by {p.requestedByName}{p.vendor ? ` · ${p.vendor}` : ""}{p.location ? ` · ${p.location}` : ""}
                  </div>
                </div>
                <Badge variant="outline" className="text-[11px] px-2 py-0.5" style={{ color: "var(--sc-blue)", background: "rgba(67,166,255,0.12)", border: "1px solid rgba(67,166,255,0.3)" }}>
                  {p.status}
                </Badge>
                <div className="flex gap-2">
                  {p.status === "Requested" && (
                    <Button size="sm" className="text-xs text-white" style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }} onClick={async () => {
                      const ok = await approvePurchaseRequest(p.id);
                      toast({ title: ok ? "Request Approved" : "Approval Failed", description: ok ? `${p.itemName ?? p.itemId} approved for ordering.` : "You may not have permission.", variant: ok ? undefined : "destructive" });
                    }} data-testid={`button-approve-pr-${p.id}`}>
                      Approve
                    </Button>
                  )}
                  {p.status === "Approved" && (
                    <Button size="sm" variant="outline" className="text-xs text-sc-2 hover:text-white" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }} onClick={async () => {
                      const ok = await receivePurchaseRequest(p.id);
                      toast({ title: ok ? "Stock Received" : "Receiving Failed", description: ok ? `${p.quantity} units posted to the ledger.` : "You may not have permission.", variant: ok ? undefined : "destructive" });
                    }} data-testid={`button-receive-pr-${p.id}`}>
                      Receive
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
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
        {locGroups.map((group) => {
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
                  <div className="col-span-3">Item & Category</div>
                  <div className="col-span-2">Location Detail</div>
                  <div className="col-span-3">Stock (On Hand / Avail)</div>
                  <div className="col-span-2">Cost / Billable</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                {group.items.map((i) => {
                  const onHand = onHandOf(i);
                  const avail = availableOf(i);
                  const low = onHand <= i.reorderPoint;
                  return (
                    <div key={i.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-5 py-4 items-center hover:bg-white/[0.02] transition-colors" data-testid={`inventory-${i.id}`}>
                      <div className="col-span-1 md:col-span-3 min-w-0">
                        <div className="font-semibold text-sm text-sc truncate">{i.name}</div>
                        <div className="text-xs text-sc-2 mt-0.5 truncate">{i.category} · Vendor: {i.vendor}</div>
                      </div>
                      <div className="col-span-1 md:col-span-2 text-sm text-sc-2 truncate">
                        {i.locationDetail || "Main Storage"}
                      </div>
                      <div className="col-span-1 md:col-span-3 flex flex-row md:flex-col justify-between md:justify-start gap-1">
                        <span className="text-xs text-sc-3 md:hidden uppercase font-semibold">Stock:</span>
                        <div className="text-sm">
                          <span className={low ? "font-bold" : "font-medium text-sc"} style={low ? { color: "var(--sc-orange)" } : {}}>{onHand}</span>
                          <span className="text-sc-3 text-xs"> on hand · </span>
                          <span className="text-sc font-medium">{avail}</span>
                          <span className="text-sc-3 text-xs"> avail · min {i.reorderPoint}</span>
                        </div>
                        <div className="flex gap-1.5 mt-0.5">
                          {low && (
                            <Badge variant="outline" className="text-[11px] px-2 py-0.5 shadow-sm" style={{ color: "var(--sc-orange)", background: "rgba(255,157,24,0.12)", border: "1px solid rgba(255,157,24,0.3)" }}>
                              Low Stock
                            </Badge>
                          )}
                          {(i.reserved ?? 0) > 0 && (
                            <Badge variant="outline" className="text-[11px] px-2 py-0.5" style={{ color: "var(--sc-blue)", background: "rgba(67,166,255,0.12)", border: "1px solid rgba(67,166,255,0.3)" }}>
                              {i.reserved} reserved
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="col-span-1 md:col-span-2 flex flex-row md:flex-col justify-between md:justify-start">
                        <span className="text-xs text-sc-3 md:hidden uppercase font-semibold">Price:</span>
                        <div className="text-sm text-sc">
                          {money(i.cost)} <span className="text-sc-3 text-xs">cost</span><br className="hidden md:block" />
                          <span className="md:mt-0.5 inline-block">{money(i.billablePrice)} <span className="text-sc-3 text-xs">bill</span></span>
                        </div>
                      </div>
                      <div className="col-span-1 md:col-span-2 flex md:justify-end">
                        <Button size="sm" variant="outline" className="text-xs text-sc-2 hover:text-white" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }} onClick={() => setActionItem(i)} data-testid={`button-actions-${i.id}`}>
                          <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" /> Actions
                        </Button>
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

      <LedgerActionDialog
        item={actionItem}
        canOverride={currentUser.role === "Administrator" || currentUser.role === "Service Manager" || currentUser.role === "Inventory Manager"}
        onClose={() => setActionItem(null)}
        onTransfer={transferInventory}
        onReserve={reserveInventory}
        onAdjust={adjustInventory}
        onCycleCount={cycleCountInventory}
      />
    </div>
  );
}

interface LedgerDialogProps {
  item: InventoryItem | null;
  canOverride: boolean;
  onClose: () => void;
  onTransfer: ReturnType<typeof useAppStore>["transferInventory"];
  onReserve: ReturnType<typeof useAppStore>["reserveInventory"];
  onAdjust: ReturnType<typeof useAppStore>["adjustInventory"];
  onCycleCount: ReturnType<typeof useAppStore>["cycleCountInventory"];
}

function LedgerActionDialog({ item, canOverride, onClose, onTransfer, onReserve, onAdjust, onCycleCount }: LedgerDialogProps) {
  const { toast } = useToast();
  const [qty, setQty] = useState("1");
  const [toLocation, setToLocation] = useState(LOCATIONS[0]);
  const [reason, setReason] = useState("");
  const [override, setOverride] = useState(false);
  const [pending, setPending] = useState(false);

  const from = item?.location;

  useEffect(() => {
    if (from) {
      setToLocation(LOCATIONS.find((l) => l !== from) ?? LOCATIONS[0]);
    }
  }, [from]);

  if (!item || !from) return null;
  const n = Number(qty);
  const validQty = Number.isFinite(n) && n !== 0;

  const notify = (ok: boolean, label: string) => {
    toast({
      title: ok ? `${label} Recorded` : `${label} Blocked`,
      description: ok
        ? `Ledger transaction posted for ${item.name}.`
        : "The backend rejected this — it may drive a location negative. A privileged user can override.",
      variant: ok ? undefined : "destructive",
    });
    if (ok) onClose();
  };

  const run = async (fn: () => Promise<boolean>, label: string) => {
    setPending(true);
    const ok = await fn();
    setPending(false);
    notify(ok, label);
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sc-panel border-none max-w-md" data-testid="dialog-ledger-action">
        <DialogHeader>
          <DialogTitle className="text-sc">{item.name}</DialogTitle>
          <p className="text-xs text-sc-2">On hand at {from}: {item.onHand ?? item.quantity} · Available: {item.available ?? item.onHand ?? item.quantity}</p>
        </DialogHeader>

        <Tabs defaultValue="transfer" className="w-full">
          <TabsList className="grid grid-cols-4 w-full" style={{ background: "var(--sc-panel-2)" }}>
            <TabsTrigger value="transfer" data-testid="tab-transfer"><ArrowLeftRight className="w-3.5 h-3.5" /></TabsTrigger>
            <TabsTrigger value="reserve" data-testid="tab-reserve"><Bookmark className="w-3.5 h-3.5" /></TabsTrigger>
            <TabsTrigger value="adjust" data-testid="tab-adjust"><SlidersHorizontal className="w-3.5 h-3.5" /></TabsTrigger>
            <TabsTrigger value="count" data-testid="tab-count"><ClipboardCheck className="w-3.5 h-3.5" /></TabsTrigger>
          </TabsList>

          <div className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-sc-2">Quantity</Label>
              <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="text-sc border-none" style={{ background: "var(--sc-panel-2)", border: "1px solid var(--sc-line)" }} data-testid="input-ledger-qty" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-sc-2">Reason (optional)</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Audit note" className="text-sc border-none" style={{ background: "var(--sc-panel-2)", border: "1px solid var(--sc-line)" }} data-testid="input-ledger-reason" />
            </div>
            {canOverride && (
              <label className="flex items-center gap-2 text-xs text-sc-2 cursor-pointer">
                <Checkbox checked={override} onCheckedChange={(c) => setOverride(!!c)} data-testid="checkbox-override" />
                Privileged override (allow negative stock)
              </label>
            )}
          </div>

          <TabsContent value="transfer" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-sc-2">Transfer to</Label>
              <Select value={toLocation} onValueChange={setToLocation}>
                <SelectTrigger className="text-sc border-none" style={{ background: "var(--sc-panel-2)", border: "1px solid var(--sc-line)" }} data-testid="select-to-location"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOCATIONS.filter((l) => l !== from).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button disabled={pending || !validQty || n <= 0 || toLocation === from} className="text-white w-full" style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }} onClick={() => run(() => onTransfer({ itemId: item.id, fromLocation: from, toLocation, quantity: n, reason: reason || undefined, override }), "Transfer")} data-testid="button-submit-transfer">
                Transfer {n > 0 ? n : ""} from {from} → {toLocation}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="reserve" className="space-y-3 mt-3">
            <p className="text-xs text-sc-3">Reserves available stock at {from} against a job.</p>
            <DialogFooter>
              <Button disabled={pending || !validQty || n <= 0} className="text-white w-full" style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }} onClick={() => run(() => onReserve({ itemId: item.id, location: from, quantity: n, reason: reason || undefined, override }), "Reservation")} data-testid="button-submit-reserve">
                Reserve {n > 0 ? n : ""} at {from}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="adjust" className="space-y-3 mt-3">
            <p className="text-xs text-sc-3">Signed delta — use a negative quantity to write stock down (shrinkage, damage).</p>
            <DialogFooter>
              <Button disabled={pending || !validQty} className="text-white w-full" style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }} onClick={() => run(() => onAdjust({ itemId: item.id, location: from, quantity: n, reason: reason || undefined, override }), "Adjustment")} data-testid="button-submit-adjust">
                Adjust {from} by {n > 0 ? `+${n}` : n}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="count" className="space-y-3 mt-3">
            <p className="text-xs text-sc-3">Cycle count reconciles the ledger to a physically counted quantity at {from}.</p>
            <DialogFooter>
              <Button disabled={pending || !Number.isFinite(n) || n < 0} className="text-white w-full" style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }} onClick={() => run(() => onCycleCount({ itemId: item.id, location: from, countedQuantity: n, reason: reason || undefined }), "Cycle Count")} data-testid="button-submit-count">
                Set {from} on-hand to {n}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
