import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { shortDate } from "@/lib/ui";
import { Search, HardHat, ShieldCheck, MapPin, Wrench, AlertCircle, Building2, Plus } from "lucide-react";
import { Equipment as EquipmentType } from "@/lib/types";

export default function Equipment() {
  const { equipment, customers, locations, workOrders, addEquipment } = useAppStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newLocationId, setNewLocationId] = useState("");
  const [newAssetName, setNewAssetName] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [newWarranty, setNewWarranty] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const customerLocations = locations.filter((l) => l.customerId === newCustomerId);

  const resetCreate = () => {
    setNewCustomerId("");
    setNewLocationId("");
    setNewAssetName("");
    setNewModel("");
    setNewSerial("");
    setNewWarranty("");
    setNewNotes("");
  };

  const handleCreate = () => {
    if (!newCustomerId || !newLocationId || !newAssetName.trim()) {
      toast({ title: "Missing information", description: "Customer, location, and asset name are required." });
      return;
    }
    const asset: EquipmentType = {
      id: `equip-${Date.now()}`,
      customerId: newCustomerId,
      locationId: newLocationId,
      assetName: newAssetName.trim(),
      model: newModel.trim(),
      serialNumber: newSerial.trim(),
      warrantyInfo: newWarranty.trim() || "N/A",
      relatedWorkOrderIds: [],
      notes: newNotes.trim() || undefined,
    };
    addEquipment(asset);
    toast({ title: "Equipment created", description: `${asset.assetName} added.` });
    setCreateOpen(false);
    resetCreate();
  };

  const filtered = equipment.filter((e) => {
    const c = customers.find((cc) => cc.id === e.customerId);
    const q = search.toLowerCase();
    return e.assetName.toLowerCase().includes(q) || e.model.toLowerCase().includes(q) || c?.name.toLowerCase().includes(q) || e.serialNumber.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">Equipment & Assets</h1>
          <p className="text-sc-2 mt-1 text-sm">Customer assets with service history and warranty tracking.</p>
        </div>
        <Button className="text-white blue-glow-soft shrink-0" style={{background:'var(--sc-btn)',border:'1px solid var(--sc-btn-highlight)'}} onClick={() => setCreateOpen(true)} data-testid="button-create-equipment">
          <Plus className="w-4 h-4 mr-2" /> New Equipment
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreate(); }}>
        <DialogContent className="max-w-lg bg-card border-panel text-sc">
          <DialogHeader className="border-b border-panel pb-4">
            <DialogTitle className="text-lg text-sc flex items-center gap-2">
              <HardHat className="w-4 h-4 text-sc-blue" /> New Equipment
            </DialogTitle>
            <DialogDescription className="text-sc-3">Register a customer asset for service history and warranty tracking.</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-sc-2">Customer</Label>
              <Select value={newCustomerId} onValueChange={(v) => { setNewCustomerId(v); setNewLocationId(""); }}>
                <SelectTrigger className="text-sc" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="select-new-equipment-customer">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent style={{background:'var(--sc-panel)',border:'1px solid var(--sc-line)'}}>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id} className="text-sc">{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-sc-2">Location</Label>
              <Select value={newLocationId} onValueChange={setNewLocationId} disabled={!newCustomerId}>
                <SelectTrigger className="text-sc" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="select-new-equipment-location">
                  <SelectValue placeholder={newCustomerId ? "Select location" : "Select a customer first"} />
                </SelectTrigger>
                <SelectContent style={{background:'var(--sc-panel)',border:'1px solid var(--sc-line)'}}>
                  {customerLocations.map((l) => <SelectItem key={l.id} value={l.id} className="text-sc">{l.name} ({l.city})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-sc-2">Asset Name</Label>
              <Input value={newAssetName} onChange={(e) => setNewAssetName(e.target.value)} placeholder="Rooftop HVAC Unit #1" className="text-sc placeholder:text-sc-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="input-new-equipment-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-sc-2">Model</Label>
                <Input value={newModel} onChange={(e) => setNewModel(e.target.value)} placeholder="Carrier 48TC" className="text-sc placeholder:text-sc-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="input-new-equipment-model" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-sc-2">Serial Number</Label>
                <Input value={newSerial} onChange={(e) => setNewSerial(e.target.value)} placeholder="SN-000000" className="text-sc placeholder:text-sc-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="input-new-equipment-serial" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-sc-2">Warranty Info</Label>
              <Input value={newWarranty} onChange={(e) => setNewWarranty(e.target.value)} placeholder="In warranty until Dec 2027" className="text-sc placeholder:text-sc-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="input-new-equipment-warranty" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-sc-2">Notes</Label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Access requirements, known issues..." rows={2} className="text-sc placeholder:text-sc-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="input-new-equipment-notes" />
            </div>
          </div>

          <DialogFooter className="border-t border-panel pt-4 sm:justify-between">
            <Button variant="outline" className="text-sc-2 hover:text-white border-panel hover:bg-white/[0.05]" onClick={() => { setCreateOpen(false); resetCreate(); }} data-testid="button-cancel-equipment">Cancel</Button>
            <Button className="text-white blue-glow-soft" style={{background:'var(--sc-btn)',border:'1px solid var(--sc-btn-highlight)'}} onClick={handleCreate} data-testid="button-save-equipment">
              <Plus className="w-4 h-4 mr-2" /> Create Equipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-sc-3" />
        <Input 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          placeholder="Search by asset name, model, serial, or customer..." 
          className="pl-9 text-sc placeholder:text-sc-3 focus-visible:ring-[var(--sc-line-active)] border-none" 
          style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}
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
            <Card key={e.id} data-testid={`equipment-${e.id}`} className="sc-panel border-none hover:border-panel-strong transition-colors overflow-hidden group">
              <div className="h-1 w-full" style={{ background: "var(--sc-line-subtle)" }} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}>
                      <HardHat className="w-6 h-6 text-sc-2" />
                    </div>
                    <div>
                      <div className="font-bold text-sc text-lg leading-tight">{e.assetName}</div>
                      <div className="text-sm text-sc-2 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-medium text-sc">{e.model}</span>
                        <span className="text-sc-3">|</span>
                        <span className="font-mono text-xs px-1.5 py-0.5 rounded text-sc-2" style={{ background: "var(--sc-elevated)" }}>SN: {e.serialNumber}</span>
                      </div>
                    </div>
                  </div>
                  {inWarranty ? (
                    <Badge variant="outline" className="text-[11px] px-2 py-0.5 whitespace-nowrap shadow-sm" style={{ color: "var(--sc-green)", background: "rgba(56,212,119,0.1)", border: "1px solid rgba(56,212,119,0.25)" }}>
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Active Warranty
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[11px] px-2 py-0.5 whitespace-nowrap text-sc-3" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}>
                      Out of Warranty
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="rounded-lg p-3" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-sc-3 uppercase tracking-wider mb-1">
                      <Building2 className="w-3.5 h-3.5" /> Customer
                    </div>
                    <button 
                      className="text-sm font-medium text-sc-blue hover:underline text-left" 
                      onClick={() => navigate(`/customers/${c?.id}`)}
                    >
                      {c?.name}
                    </button>
                    <div className="text-xs text-sc-2 mt-0.5 flex items-start gap-1">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="truncate">{loc?.name}</span>
                    </div>
                  </div>

                  <div className="rounded-lg p-3" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-sc-3 uppercase tracking-wider mb-1">
                      <Wrench className="w-3.5 h-3.5" /> Service Status
                    </div>
                    <div className="text-sm text-sc font-medium">
                      Last: {e.lastServiced ? shortDate(e.lastServiced) : "Never"}
                    </div>
                    <div className="text-xs text-sc-2 mt-0.5">
                      Warranty: <span className="text-sc">{e.warrantyInfo}</span>
                    </div>
                  </div>
                </div>

                {e.notes && (
                  <div className="mt-4 text-sm text-sc-2 flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(67,166,255,0.06)", border: "1px solid rgba(67,166,255,0.15)" }}>
                    <AlertCircle className="w-4 h-4 text-sc-blue shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{e.notes}</p>
                  </div>
                )}

                {related.length > 0 && (
                  <div className="mt-4 pt-4 flex items-center gap-3 border-t border-panel-subtle">
                    <span className="text-xs font-semibold text-sc-3 uppercase tracking-wider">History:</span>
                    <div className="flex flex-wrap gap-2">
                      {related.map((w) => (
                        <Badge 
                          key={w.id} 
                          variant="secondary" 
                          className="cursor-pointer shadow-sm transition-colors text-[11px] text-sc-2 hover:text-white" 
                          style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}
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
          <div className="col-span-1 lg:col-span-2 p-12 text-center text-sc-3 border border-dashed rounded-xl sc-panel border-panel-subtle">
            No equipment found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
