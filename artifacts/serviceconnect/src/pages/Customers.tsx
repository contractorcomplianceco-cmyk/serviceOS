import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { money } from "@/lib/ui";
import { Search, Building2, ChevronRight, Briefcase, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Customer } from "@/lib/types";

export default function Customers() {
  const { customers, workOrders, locations, currentUser, addCustomer } = useAppStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const resetCreate = () => {
    setNewName("");
    setNewIndustry("");
    setNewPhone("");
    setNewEmail("");
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast({ title: "Name required", description: "Enter a customer name." });
      return;
    }
    const customer: Customer = {
      id: `cust-${Date.now()}`,
      name: newName.trim(),
      industry: newIndustry.trim() || "General",
      phone: newPhone.trim(),
      email: newEmail.trim(),
      status: "Active",
      accountManagerId: currentUser.id,
      tags: [],
      contacts: [],
      rateRules: [],
      requirements: [],
      portalRules: "",
      taxCode: "",
      balance: 0,
    };
    const created = await addCustomer(customer);
    if (!created) {
      toast({ title: "Could not create customer", description: "Please try again.", variant: "destructive" });
      return;
    }
    toast({ title: "Customer created", description: `${created.name} added.` });
    setCreateOpen(false);
    resetCreate();
    navigate(`/customers/${created.id}`);
  };

  const filtered = customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.industry.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">Customers</h1>
          <p className="text-sc-2 mt-1 text-sm">
            Accounts, requirements, rate rules, and contacts.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-sc-3" />
            <Input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search customers..." 
              className="pl-9 sc-elevated shadow-sm h-9 text-sm text-sc placeholder:text-sc-3" 
              data-testid="input-search-customer" 
            />
          </div>
          <Button className="text-white blue-glow-soft shrink-0" style={{background:'var(--sc-btn)',border:'1px solid var(--sc-btn-highlight)'}} onClick={() => setCreateOpen(true)} data-testid="button-create-customer">
            <Plus className="w-4 h-4 mr-2" /> New Customer
          </Button>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreate(); }}>
        <DialogContent className="max-w-lg bg-card border-panel text-sc">
          <DialogHeader className="border-b border-panel pb-4">
            <DialogTitle className="text-lg text-sc flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sc-blue" /> New Customer
            </DialogTitle>
            <DialogDescription className="text-sc-3">Create a customer account. Contacts, rate rules, and requirements can be added later.</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-sc-2">Customer Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Acme Retail Group" className="text-sc placeholder:text-sc-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="input-new-customer-name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-sc-2">Industry</Label>
              <Input value={newIndustry} onChange={(e) => setNewIndustry(e.target.value)} placeholder="Retail" className="text-sc placeholder:text-sc-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="input-new-customer-industry" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-sc-2">Phone</Label>
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="(555) 123-4567" className="text-sc placeholder:text-sc-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="input-new-customer-phone" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-sc-2">Email</Label>
                <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="ops@acme.com" className="text-sc placeholder:text-sc-3" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}} data-testid="input-new-customer-email" />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-panel pt-4 sm:justify-between">
            <Button variant="outline" className="text-sc-2 hover:text-white border-panel hover:bg-white/[0.05]" onClick={() => { setCreateOpen(false); resetCreate(); }} data-testid="button-cancel-customer">Cancel</Button>
            <Button className="text-white blue-glow-soft" style={{background:'var(--sc-btn)',border:'1px solid var(--sc-btn-highlight)'}} onClick={handleCreate} data-testid="button-save-customer">
              <Plus className="w-4 h-4 mr-2" /> Create Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((c) => {
          const openJobs = workOrders.filter((w) => w.customerId === c.id && !["Closed", "Cancelled", "Invoiced"].includes(w.status)).length;
          const siteCount = locations.filter((l) => l.customerId === c.id).length;
          
          return (
            <Card key={c.id} className="sc-panel shadow-sm cursor-pointer hover:border-[color:var(--sc-line-active)] hover:shadow-md transition-all group" onClick={() => navigate(`/customers/${c.id}`)} data-testid={`customer-${c.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl sc-elevated flex items-center justify-center shrink-0 group-hover:border-[color:var(--sc-line-active)] transition-colors">
                      <Building2 className="w-6 h-6 text-sc-3 group-hover:text-sc-blue transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sc truncate text-base">{c.name}</div>
                      <div className="text-xs font-medium text-sc-3 uppercase tracking-wider flex items-center gap-1 mt-0.5">
                        <Briefcase className="w-3 h-3" /> {c.industry}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-[10px] uppercase font-bold tracking-wider",
                    c.status === "Active" ? "bg-[rgba(56,212,119,0.1)] text-[color:var(--sc-green)] border-[rgba(56,212,119,0.2)]" : "sc-elevated text-sc-2 border-panel-subtle"
                  )}>
                    {c.status}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-1.5 mb-5 h-6 overflow-hidden">
                  {c.tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px] sc-elevated text-sc-2 border-panel-subtle font-medium">
                      {t}
                    </Badge>
                  ))}
                  {c.tags.length > 3 && (
                    <Badge variant="secondary" className="text-[10px] sc-elevated text-sc-2 border-panel-subtle font-medium">
                      +{c.tags.length - 3}
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-panel-subtle">
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-sc leading-none mb-1">{openJobs}</span>
                    <span className="text-[10px] font-semibold text-sc-3 uppercase tracking-wider">Open Jobs</span>
                  </div>
                  <div className="flex flex-col border-l border-panel-subtle pl-3">
                    <span className="text-xl font-bold text-sc leading-none mb-1">{siteCount}</span>
                    <span className="text-[10px] font-semibold text-sc-3 uppercase tracking-wider">Sites</span>
                  </div>
                  <div className="flex flex-col border-l border-panel-subtle pl-3">
                    <span className={cn(
                      "text-xl font-bold leading-none mb-1 truncate",
                      c.balance > 0 ? "text-[color:var(--sc-orange)]" : "text-sc"
                    )}>{money(c.balance)}</span>
                    <span className="text-[10px] font-semibold text-sc-3 uppercase tracking-wider">Balance</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
