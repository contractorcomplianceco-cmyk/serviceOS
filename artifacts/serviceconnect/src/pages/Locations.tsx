import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Search, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Location } from "@/lib/types";

export default function Locations() {
  const { locations, customers, workOrders, addLocation } = useAppStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newZip, setNewZip] = useState("");
  const [newRegion, setNewRegion] = useState("Tampa");
  const [newNotes, setNewNotes] = useState("");

  const resetCreate = () => {
    setNewCustomerId("");
    setNewName("");
    setNewAddress("");
    setNewCity("");
    setNewState("");
    setNewZip("");
    setNewRegion("Tampa");
    setNewNotes("");
  };

  const handleCreate = () => {
    if (!newCustomerId || !newName.trim()) {
      toast({ title: "Missing information", description: "Customer and location name are required." });
      return;
    }
    const loc: Location = {
      id: `loc-${Date.now()}`,
      customerId: newCustomerId,
      name: newName.trim(),
      address: newAddress.trim(),
      city: newCity.trim(),
      state: newState.trim(),
      zip: newZip.trim(),
      region: newRegion,
      notes: newNotes.trim(),
    };
    addLocation(loc);
    toast({ title: "Location created", description: `${loc.name} added.` });
    setCreateOpen(false);
    resetCreate();
  };

  const filtered = locations.filter((l) => {
    const c = customers.find((cc) => cc.id === l.customerId);
    const q = search.toLowerCase();
    return l.name.toLowerCase().includes(q) || l.city.toLowerCase().includes(q) || c?.name.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">Locations</h1>
          <p className="text-sc-2 mt-1 text-sm">
            Service sites with access notes and region assignment.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-sc-3" />
            <Input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search locations..." 
              className="pl-9 sc-elevated shadow-sm h-9 text-sm text-sc placeholder:text-sc-3" 
              data-testid="input-search-location" 
            />
          </div>
          <Button className="text-white blue-glow-soft shrink-0" style={{background:'var(--sc-btn)',border:'1px solid var(--sc-btn-highlight)'}} onClick={() => setCreateOpen(true)} data-testid="button-create-location">
            <Plus className="w-4 h-4 mr-2" /> New Location
          </Button>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreate(); }}>
        <DialogContent className="max-w-lg bg-card border-panel text-sc">
          <DialogHeader className="border-b border-panel pb-4">
            <DialogTitle className="text-lg text-sc flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sc-blue" /> New Location
            </DialogTitle>
            <DialogDescription className="text-sc-3">Add a service site and assign it to a customer and region.</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-sc-2">Customer</Label>
              <Select value={newCustomerId} onValueChange={setNewCustomerId}>
                <SelectTrigger className="text-sc" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="select-new-location-customer">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent style={{background:'var(--sc-panel)',border:'1px solid var(--sc-line)'}}>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id} className="text-sc">{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-sc-2">Location Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Store #1234" className="text-sc placeholder:text-sc-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="input-new-location-name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-sc-2">Address</Label>
              <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="123 Main St" className="text-sc placeholder:text-sc-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="input-new-location-address" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-1">
                <Label className="text-xs font-semibold text-sc-2">City</Label>
                <Input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="Tampa" className="text-sc placeholder:text-sc-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="input-new-location-city" />
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label className="text-xs font-semibold text-sc-2">State</Label>
                <Input value={newState} onChange={(e) => setNewState(e.target.value)} placeholder="FL" className="text-sc placeholder:text-sc-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="input-new-location-state" />
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label className="text-xs font-semibold text-sc-2">ZIP</Label>
                <Input value={newZip} onChange={(e) => setNewZip(e.target.value)} placeholder="33601" className="text-sc placeholder:text-sc-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="input-new-location-zip" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-sc-2">Region</Label>
              <Select value={newRegion} onValueChange={setNewRegion}>
                <SelectTrigger className="text-sc" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="select-new-location-region">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{background:'var(--sc-panel)',border:'1px solid var(--sc-line)'}}>
                  <SelectItem value="Tampa" className="text-sc">Tampa</SelectItem>
                  <SelectItem value="Orlando" className="text-sc">Orlando</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-sc-2">Access Notes</Label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Gate code, hours, contact on arrival..." rows={2} className="text-sc placeholder:text-sc-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="input-new-location-notes" />
            </div>
          </div>

          <DialogFooter className="border-t border-panel pt-4 sm:justify-between">
            <Button variant="outline" className="text-sc-2 hover:text-white border-panel hover:bg-white/[0.05]" onClick={() => { setCreateOpen(false); resetCreate(); }} data-testid="button-cancel-location">Cancel</Button>
            <Button className="text-white blue-glow-soft" style={{background:'var(--sc-btn)',border:'1px solid var(--sc-btn-highlight)'}} onClick={handleCreate} data-testid="button-save-location">
              <Plus className="w-4 h-4 mr-2" /> Create Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((l) => {
          const c = customers.find((cc) => cc.id === l.customerId);
          const openJobs = workOrders.filter((w) => w.locationId === l.id && !["Closed", "Cancelled", "Invoiced"].includes(w.status)).length;
          
          return (
            <Card key={l.id} className="sc-panel shadow-sm group hover:border-[color:var(--sc-line-active)] transition-colors" data-testid={`location-${l.id}`}>
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg sc-elevated flex items-center justify-center shrink-0 mt-0.5 group-hover:border-[color:var(--sc-line-active)] transition-colors">
                      <MapPin className="w-5 h-5 text-sc-3 group-hover:text-sc-blue transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sc text-base truncate">{l.name}</div>
                      <button className="text-xs font-semibold text-sc-blue hover:underline uppercase tracking-wider mt-0.5 text-left truncate w-full" onClick={() => navigate(`/customers/${c?.id}`)}>
                        {c?.name}
                      </button>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] sc-elevated text-sc-3 border-panel-subtle uppercase font-bold tracking-wider shrink-0 ml-2">
                    {l.region}
                  </Badge>
                </div>
                
                <div className="flex-1">
                  <div className="text-sm font-medium text-sc-2 leading-relaxed">
                    {l.address}<br />
                    {l.city}, {l.state} {l.zip}
                  </div>
                  
                  {l.notes && (
                    <div className="text-xs font-medium text-sc-2 mt-4 sc-elevated rounded-md px-3 py-2 border border-panel-subtle">
                      {l.notes}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-panel-subtle flex items-center justify-between">
                  {openJobs > 0 ? (
                    <Badge variant="outline" className="bg-[rgba(255,157,24,0.1)] text-[color:var(--sc-orange)] border-[rgba(255,157,24,0.2)] text-xs font-bold px-2 py-0.5">
                      {openJobs} Open Job{openJobs > 1 ? "s" : ""}
                    </Badge>
                  ) : (
                    <span className="text-xs font-medium text-sc-3 uppercase tracking-wider">No active jobs</span>
                  )}
                  
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-sc-3 hover:text-sc-blue group-hover:translate-x-1 transition-transform">
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
