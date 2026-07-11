import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { priorityClass, statusClass, portalClass, shortDate } from "@/lib/ui";
import { Plus, Search, Building2, MapPin, Calendar as CalendarIcon, User as UserIcon, Tag } from "lucide-react";
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

  const statuses: WorkOrderStatus[] = ["New", "Triage Needed", "Need Scheduled", "Scheduled", "First Trip", "On Site", "Awaiting Materials", "Awaiting Quote Approval", "Return Trip Needed", "Completed Pending Review", "Ready for Billing", "Invoiced", "Closed", "Cancelled"];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Work Orders</h1>
          <p className="text-slate-500 mt-1 text-sm">{isTech ? "Your assigned jobs." : "Manage all active and historical jobs."}</p>
        </div>
        {!isTech && (
          <Button className="bg-primary text-primary-foreground shadow-md hover:bg-primary/90" data-testid="button-create-work-order">
            <Plus className="w-4 h-4 mr-2" /> New Work Order
          </Button>
        )}
      </div>

      <Card className="border border-slate-200/60 shadow-sm bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 bg-slate-50/50">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search by WO#, customer, or description..." 
              className="pl-9 bg-white border-slate-200 focus-visible:ring-primary shadow-sm" 
              data-testid="input-search-wo" 
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-[220px] bg-white border-slate-200 shadow-sm" data-testid="select-status-filter">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white border-slate-200 shadow-sm" data-testid="select-region-filter">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              <SelectItem value="Tampa">Tampa</SelectItem>
              <SelectItem value="Orlando">Orlando</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="divide-y divide-slate-100">
          {/* Table Header */}
          <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
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
                className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-4 px-6 py-4 items-center hover:bg-slate-50/80 transition-colors cursor-pointer group" 
                data-testid={`row-wo-${wo.id}`}
              >
                {/* Mobile: Top Row */}
                <div className="flex justify-between items-start lg:hidden col-span-1">
                  <div>
                    <div className="font-bold text-slate-900 group-hover:text-primary transition-colors text-base">{wo.number}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={statusClass(wo.status)}>{wo.status}</Badge>
                      <Badge variant="outline" className={priorityClass(wo.priority)}>{wo.priority}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">{wo.source}</Badge>
                  </div>
                </div>

                {/* Desktop: WO Column */}
                <div className="hidden lg:block col-span-2">
                  <div className="font-bold text-slate-900 group-hover:text-primary transition-colors text-sm flex items-center gap-1.5">
                    {wo.number}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                    <Tag className="w-3 h-3" />
                    <span className="truncate">{wo.type}</span>
                    <span className="text-slate-300">•</span>
                    <span className="truncate">{wo.source}</span>
                  </div>
                </div>

                {/* Customer Column */}
                <div className="col-span-1 lg:col-span-3 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0 hidden lg:block" />
                    <span className="font-semibold text-slate-800 truncate">{customer?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{location?.name} ({location?.city})</span>
                  </div>
                </div>

                {/* Status Column */}
                <div className="hidden lg:flex col-span-3 flex-col items-start gap-2">
                  <Badge variant="outline" className={statusClass(wo.status)}>{wo.status}</Badge>
                  <div className="flex gap-2">
                    <Badge variant="outline" className={priorityClass(wo.priority)}>{wo.priority}</Badge>
                    {wo.materialsFlag && <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] uppercase font-bold tracking-wider">Mats</Badge>}
                    {wo.quoteFlag && <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] uppercase font-bold tracking-wider">Quote</Badge>}
                  </div>
                </div>

                {/* Tech / Due Column */}
                <div className="col-span-1 lg:col-span-2 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <UserIcon className="w-4 h-4 text-slate-400 shrink-0 hidden lg:block" />
                    {tech ? (
                      <span className="font-medium text-slate-700 truncate">{tech.name}</span>
                    ) : (
                      <span className="text-amber-600 font-medium italic">Unassigned</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
              <Search className="w-10 h-10 text-slate-300 mb-3" />
              <h3 className="text-lg font-medium text-slate-900">No work orders found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md">
                Try adjusting your search terms or filters to find what you're looking for.
              </p>
              {(search || status !== "all" || region !== "all") && (
                <Button 
                  variant="outline" 
                  className="mt-4"
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