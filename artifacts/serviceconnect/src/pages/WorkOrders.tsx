import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { priorityClass, statusClass, portalClass, shortDate } from "@/lib/ui";
import { Plus, Search } from "lucide-react";
import { WorkOrderStatus } from "@/lib/types";

export default function WorkOrders() {
  const { workOrders, customers, locations, users, currentUser } = useAppStore();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");

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

  const statuses: WorkOrderStatus[] = ["New", "Triage Needed", "Need Scheduled", "Scheduled", "On Site", "Awaiting Materials", "Awaiting Quote Approval", "Completed Pending Review", "Ready for Billing", "Invoiced"];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Work Orders</h1>
          <p className="text-muted-foreground">{isTech ? "Your assigned jobs." : "Manage all active and historical jobs."}</p>
        </div>
        {!isTech && (
          <Button className="bg-primary text-white" data-testid="button-create-work-order">
            <Plus className="w-4 h-4 mr-2" /> Create Work Order
          </Button>
        )}
      </div>

      <Card>
        <div className="p-4 border-b flex gap-3 bg-slate-50/50 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by WO#, customer, or description..." className="pl-9 bg-white" data-testid="input-search-wo" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[200px] bg-white" data-testid="select-status-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-[160px] bg-white" data-testid="select-region-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              <SelectItem value="Tampa">Tampa</SelectItem>
              <SelectItem value="Orlando">Orlando</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="divide-y">
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-slate-50/50">
            <div className="col-span-2">Work Order</div>
            <div className="col-span-3">Customer / Location</div>
            <div className="col-span-2">Priority</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Tech / Due</div>
            <div className="col-span-1">Portal</div>
          </div>
          {filtered.map((wo) => {
            const customer = customers.find((c) => c.id === wo.customerId);
            const location = locations.find((l) => l.id === wo.locationId);
            const tech = users.find((u) => u.id === wo.assignedTechnicianId);
            return (
              <div key={wo.id} onClick={() => navigate(`/work-orders/${wo.id}`)} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-slate-50 transition-colors cursor-pointer" data-testid={`row-wo-${wo.id}`}>
                <div className="col-span-2">
                  <div className="font-semibold text-primary text-sm">{wo.number}</div>
                  <div className="text-xs text-muted-foreground">{wo.type}</div>
                </div>
                <div className="col-span-3 min-w-0">
                  <div className="font-medium text-sm truncate">{customer?.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{location?.name}</div>
                </div>
                <div className="col-span-2">
                  <Badge variant="outline" className={priorityClass(wo.priority)}>{wo.priority}</Badge>
                </div>
                <div className="col-span-2">
                  <Badge variant="outline" className={statusClass(wo.status)}>{wo.status}</Badge>
                </div>
                <div className="col-span-2">
                  <div className="text-sm">{tech?.name ?? <span className="text-muted-foreground">Unassigned</span>}</div>
                  <div className="text-xs text-muted-foreground">Due {shortDate(wo.dueDate)}</div>
                </div>
                <div className="col-span-1">
                  <Badge variant="outline" className={`${portalClass(wo.portalSyncStatus)} text-[10px]`}>{wo.portalSyncStatus}</Badge>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-16 text-center text-muted-foreground">No work orders match your filters.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
