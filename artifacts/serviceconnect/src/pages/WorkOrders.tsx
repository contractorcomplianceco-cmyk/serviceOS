import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { priorityClass, statusClass, portalClass, shortDate } from "@/lib/ui";
import { Plus, Search, Building2, MapPin, Calendar as CalendarIcon, User as UserIcon, Tag } from "lucide-react";
import { WorkOrderStatus, Priority, WorkOrder } from "@/lib/types";

export default function WorkOrders() {
  const { workOrders, customers, locations, users, currentUser, addWorkOrder } = useAppStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState<string>("");
  const [newLocationId, setNewLocationId] = useState<string>("");
  const [newPriority, setNewPriority] = useState<Priority>("Medium");
  const [newType, setNewType] = useState<string>("Service");
  const [newDescription, setNewDescription] = useState<string>("");

  const priorities: Priority[] = ["Low", "Medium", "High", "Emergency"];
  const customerLocations = locations.filter((l) => l.customerId === newCustomerId);

  const resetCreate = () => {
    setNewCustomerId("");
    setNewLocationId("");
    setNewPriority("Medium");
    setNewType("Service");
    setNewDescription("");
  };

  const handleCreate = () => {
    if (!newCustomerId || !newLocationId || !newDescription.trim()) {
      toast({ title: "Missing information", description: "Customer, location, and description are required." });
      return;
    }
    const loc = locations.find((l) => l.id === newLocationId);
    const seq = workOrders.length + 1042;
    const id = `wo-${Date.now()}`;
    const wo: WorkOrder = {
      id,
      number: `WO-2026-${seq}`,
      source: "Manual",
      customerId: newCustomerId,
      locationId: newLocationId,
      priority: newPriority,
      status: "Need Scheduled",
      type: newType,
      region: loc?.region ?? "Tampa",
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      billingStatus: "Needs Review",
      description: newDescription.trim(),
      portalSyncStatus: "Manual Copy Needed",
      trips: [],
      labor: [],
      materials: [],
      attachments: [],
      internalLog: [],
      createdAt: new Date().toISOString(),
    };
    addWorkOrder(wo);
    toast({ title: "Work order created", description: `${wo.number} created for ${customers.find((c) => c.id === newCustomerId)?.name}.` });
    setCreateOpen(false);
    resetCreate();
    navigate(`/work-orders/${id}`);
  };

  const isTech = currentUser.role === "Technician" || currentUser.role === "Subcontractor";
  const scoped = isTech ? workOrders.filter((w) => w.assignedTechnicianId === currentUser.id) : workOrders;

  const filtered = scoped.filter((wo) => {
    const customer = customers.find((c) => c.id === wo.customerId);
    const q = search.toLowerCase();
    const matchesSearch = !q || wo.number.toLowerCase().includes(q) || customer?.name.toLowerCase().includes(q) || wo.description.toLowerCase().includes(q);
    const matchesStatus = status === "all" || wo.status === status;
    const matchesRegion = region === "all" || wo.region === region;
    return matchesSearch && matchesStatus && matchesRegion;
  });

  const statuses: WorkOrderStatus[] = ["New", "Triage Needed", "Need Scheduled", "Scheduled", "First Trip", "On Site", "Awaiting Materials", "Awaiting Quote Approval", "Return Trip Needed", "Completed Pending Review", "Ready for Billing", "Invoiced", "Closed", "Cancelled"];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">Work Orders</h1>
          <p className="text-sc-3 mt-1 text-sm">{isTech ? "Your assigned jobs." : "Manage all active and historical jobs."}</p>
        </div>
        {!isTech && (
          <Button 
            className="text-white blue-glow-soft hover:opacity-90" 
            style={{background:'var(--sc-btn)',border:'1px solid var(--sc-btn-highlight)'}}
            onClick={() => setCreateOpen(true)}
            data-testid="button-create-work-order"
          >
            <Plus className="w-4 h-4 mr-2" /> New Work Order
          </Button>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreate(); }}>
        <DialogContent className="max-w-lg bg-card border-panel text-sc">
          <DialogHeader className="border-b border-panel pb-4">
            <DialogTitle className="text-lg text-sc flex items-center gap-2">
              <Plus className="w-4 h-4 text-sc-blue" /> New Work Order
            </DialogTitle>
            <DialogDescription className="text-sc-3">Manually create a work order. It will start as a draft requiring scheduling.</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-sc-2">Customer</Label>
              <Select value={newCustomerId} onValueChange={(v) => { setNewCustomerId(v); setNewLocationId(""); }}>
                <SelectTrigger className="text-sc" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="select-new-wo-customer">
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
                <SelectTrigger className="text-sc" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="select-new-wo-location">
                  <SelectValue placeholder={newCustomerId ? "Select location" : "Select a customer first"} />
                </SelectTrigger>
                <SelectContent style={{background:'var(--sc-panel)',border:'1px solid var(--sc-line)'}}>
                  {customerLocations.map((l) => <SelectItem key={l.id} value={l.id} className="text-sc">{l.name} ({l.city})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-sc-2">Priority</Label>
                <Select value={newPriority} onValueChange={(v) => setNewPriority(v as Priority)}>
                  <SelectTrigger className="text-sc" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="select-new-wo-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{background:'var(--sc-panel)',border:'1px solid var(--sc-line)'}}>
                    {priorities.map((p) => <SelectItem key={p} value={p} className="text-sc">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-sc-2">Type</Label>
                <Input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="Service" className="text-sc placeholder:text-sc-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="input-new-wo-type" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-sc-2">Description</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Describe the work required..." rows={3} className="text-sc placeholder:text-sc-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="input-new-wo-description" />
            </div>
          </div>

          <DialogFooter className="border-t border-panel pt-4 sm:justify-between">
            <Button variant="outline" className="text-sc-2 hover:text-white border-panel hover:bg-white/[0.05]" onClick={() => { setCreateOpen(false); resetCreate(); }} data-testid="button-cancel-work-order">Cancel</Button>
            <Button className="text-white blue-glow-soft" style={{background:'var(--sc-btn)',border:'1px solid var(--sc-btn-highlight)'}} onClick={handleCreate} data-testid="button-save-work-order">
              <Plus className="w-4 h-4 mr-2" /> Create Work Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="sc-panel overflow-hidden border-none rounded-xl">
        <div className="p-4 border-b border-panel-subtle flex flex-col sm:flex-row gap-3" style={{ background: "var(--sc-inner)" }}>
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-sc-3" />
            <Input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search by WO#, customer, or description..." 
              className="pl-9 text-sc placeholder:text-sc-3 focus-visible:ring-[color:var(--sc-line-active)]" 
              style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}
              data-testid="input-search-wo" 
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-[220px] text-sc" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }} data-testid="select-status-filter">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}>
              <SelectItem value="all" className="text-sc">All Statuses</SelectItem>
              {statuses.map((s) => <SelectItem key={s} value={s} className="text-sc">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-full sm:w-[180px] text-sc" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }} data-testid="select-region-filter">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}>
              <SelectItem value="all" className="text-sc">All Regions</SelectItem>
              <SelectItem value="Tampa" className="text-sc">Tampa</SelectItem>
              <SelectItem value="Orlando" className="text-sc">Orlando</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="divide-y divide-[color:var(--sc-line-subtle)]">
          {/* Table Header */}
          <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-sc-3 uppercase tracking-wider border-b border-panel-subtle" style={{ background: "var(--sc-panel-2)" }}>
            <div className="col-span-2">Work Order</div>
            <div className="col-span-3">Customer / Location</div>
            <div className="col-span-3">Status / Priority</div>
            <div className="col-span-2">Assignment / Due</div>
            <div className="col-span-2 text-right">Portal Sync</div>
          </div>
          
          {/* Table Body */}
          {filtered.map((wo) => {
            const customer = customers.find((c) => c.id === wo.customerId);
            const location = locations.find((l) => l.id === wo.locationId);
            const tech = users.find((u) => u.id === wo.assignedTechnicianId);
            return (
              <div 
                key={wo.id} 
                onClick={() => navigate(`/work-orders/${wo.id}`)} 
                className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-4 px-6 py-4 items-center hover:bg-white/[0.04] transition-colors cursor-pointer group" 
                data-testid={`row-wo-${wo.id}`}
              >
                {/* Mobile: Top Row */}
                <div className="flex justify-between items-start lg:hidden col-span-1">
                  <div>
                    <div className="font-bold text-sc group-hover:text-sc-blue transition-colors text-base">{wo.number}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={statusClass(wo.status)}>{wo.status}</Badge>
                      <Badge variant="outline" className={priorityClass(wo.priority)}>{wo.priority}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-[10px] text-sc-2 border-panel bg-[color:var(--sc-elevated)]">{wo.source}</Badge>
                  </div>
                </div>

                {/* Desktop: WO Column */}
                <div className="hidden lg:block col-span-2">
                  <div className="font-bold text-sc group-hover:text-sc-blue transition-colors text-sm flex items-center gap-1.5">
                    {wo.number}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-sc-3">
                    <Tag className="w-3 h-3" />
                    <span className="truncate">{wo.type}</span>
                    <span className="text-sc-3">•</span>
                    <span className="truncate">{wo.source}</span>
                  </div>
                </div>

                {/* Customer Column */}
                <div className="col-span-1 lg:col-span-3 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-sc-3 shrink-0 hidden lg:block" />
                    <span className="font-semibold text-sc truncate">{customer?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-sc-3">
                    <MapPin className="w-3.5 h-3.5 text-sc-3 shrink-0" />
                    <span className="truncate">{location?.name} ({location?.city})</span>
                  </div>
                </div>

                {/* Status Column */}
                <div className="hidden lg:flex col-span-3 flex-col items-start gap-2">
                  <Badge variant="outline" className={statusClass(wo.status)}>{wo.status}</Badge>
                  <div className="flex gap-2">
                    <Badge variant="outline" className={priorityClass(wo.priority)}>{wo.priority}</Badge>
                    {wo.materialsFlag && <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-sc-2 border-panel bg-[color:var(--sc-elevated)]">Mats</Badge>}
                    {wo.quoteFlag && <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-[color:var(--sc-orange)] border-[color:rgba(255,157,24,0.3)] bg-[color:rgba(255,157,24,0.12)]">Quote</Badge>}
                  </div>
                </div>

                {/* Tech / Due Column */}
                <div className="col-span-1 lg:col-span-2 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <UserIcon className="w-4 h-4 text-sc-3 shrink-0 hidden lg:block" />
                    {tech ? (
                      <span className="font-medium text-sc-2 truncate">{tech.name}</span>
                    ) : (
                      <span className="text-[color:var(--sc-orange)] font-medium italic">Unassigned</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-sc-3">
                    <CalendarIcon className="w-3.5 h-3.5 text-sc-3 shrink-0" />
                    <span>Due {shortDate(wo.dueDate)}</span>
                  </div>
                </div>

                {/* Portal Column */}
                <div className="col-span-1 lg:col-span-2 flex justify-start lg:justify-end">
                  <Badge variant="outline" className={`${portalClass(wo.portalSyncStatus)} text-xs px-2.5 py-1`}>
                    {wo.portalSyncStatus}
                  </Badge>
                </div>
              </div>
            );
          })}
          
          {filtered.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-center px-4">
              <Search className="w-10 h-10 text-sc-3 mb-3" />
              <h3 className="text-lg font-medium text-sc">No work orders found</h3>
              <p className="text-sm text-sc-3 mt-1 max-w-md">
                Try adjusting your search terms or filters to find what you're looking for.
              </p>
              {(search || status !== "all" || region !== "all") && (
                <Button 
                  variant="outline" 
                  className="mt-4 text-sc-2 hover:text-white"
                  style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}}
                  onClick={() => { setSearch(""); setStatus("all"); setRegion("all"); }}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
