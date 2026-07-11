import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { money, shortDate } from "@/lib/ui";
import { Search, FileSignature, Plus, RefreshCw, Pause, Play, Ban, Bell } from "lucide-react";
import {
  useListContracts,
  useCreateContract,
  useUpdateContract,
  useRenewContract,
  useListContractReminders,
  getListContractsQueryKey,
  getListContractRemindersQueryKey,
  type ServiceContract,
} from "@workspace/api-client-react";

function contractStatusClass(status: string): string {
  switch (status) {
    case "Active":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "Paused":
      return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    case "Ended":
    case "Expired":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

export default function Contracts() {
  const { customers, locations } = useAppStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const contractsQuery = useListContracts();
  const remindersQuery = useListContractReminders();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const renewContract = useRenewContract();

  const contracts = contractsQuery.data ?? [];
  const reminders = remindersQuery.data ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListContractsQueryKey() });
    qc.invalidateQueries({ queryKey: getListContractRemindersQueryKey() });
  };

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "Unknown customer";

  const [createOpen, setCreateOpen] = useState(false);
  const [fCustomerId, setFCustomerId] = useState("");
  const [fLocationId, setFLocationId] = useState("");
  const [fName, setFName] = useState("");
  const [fValue, setFValue] = useState("");
  const [fLaborRate, setFLaborRate] = useState("");
  const [fStartDate, setFStartDate] = useState("");
  const [fRenewalDate, setFRenewalDate] = useState("");
  const [fDescription, setFDescription] = useState("");

  const customerLocations = locations.filter((l) => l.customerId === fCustomerId);

  const resetCreate = () => {
    setFCustomerId("");
    setFLocationId("");
    setFName("");
    setFValue("");
    setFLaborRate("");
    setFStartDate("");
    setFRenewalDate("");
    setFDescription("");
  };

  const handleCreate = () => {
    if (!fCustomerId || !fName.trim() || !fStartDate || !fRenewalDate) {
      toast({ title: "Missing information", description: "Customer, name, start date, and renewal date are required." });
      return;
    }
    createContract.mutate(
      {
        data: {
          customerId: fCustomerId,
          locationId: fLocationId || undefined,
          name: fName.trim(),
          value: fValue ? Number(fValue) : undefined,
          laborRate: fLaborRate ? Number(fLaborRate) : undefined,
          startDate: fStartDate,
          renewalDate: fRenewalDate,
          description: fDescription.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Contract created", description: `${fName.trim()} is now active.` });
          invalidate();
          setCreateOpen(false);
          resetCreate();
        },
        onError: () => toast({ title: "Could not create contract", description: "Please try again." }),
      },
    );
  };

  const setStatus = (c: ServiceContract, status: "Active" | "Paused" | "Ended") => {
    updateContract.mutate(
      { id: c.id, data: { status } },
      {
        onSuccess: () => {
          toast({ title: "Contract updated", description: `${c.name} set to ${status}.` });
          invalidate();
        },
        onError: () => toast({ title: "Update failed", description: "Please try again." }),
      },
    );
  };

  const handleRenew = (c: ServiceContract) => {
    renewContract.mutate(
      { id: c.id, data: { termMonths: 12 } },
      {
        onSuccess: () => {
          toast({ title: "Contract renewed", description: `${c.name} extended by 12 months.` });
          invalidate();
        },
        onError: () => toast({ title: "Renewal failed", description: "Please try again." }),
      },
    );
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contracts.filter(
      (c) => c.name.toLowerCase().includes(q) || customerName(c.customerId).toLowerCase().includes(q),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contracts, search, customers]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">Service Contracts</h1>
          <p className="text-sc-2 mt-1 text-sm">Recurring maintenance agreements with renewal tracking.</p>
        </div>
        <Button className="text-white blue-glow-soft shrink-0" style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }} onClick={() => setCreateOpen(true)} data-testid="button-create-contract">
          <Plus className="w-4 h-4 mr-2" /> New Contract
        </Button>
      </div>

      {reminders.length > 0 && (
        <Card className="bg-card border-panel">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-sc-blue" />
              <span className="text-sm font-semibold text-sc">Renewal reminders</span>
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">{reminders.length}</Badge>
            </div>
            <div className="space-y-2">
              {reminders.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm" data-testid={`reminder-${r.id}`}>
                  <span className="text-sc-2">{customerName(r.customerId)} — {r.message}</span>
                  <span className="text-sc-3">{shortDate(r.dueDate)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sc-3" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contracts…" className="pl-9 bg-card border-panel text-sc" data-testid="input-search-contracts" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((c) => (
          <Card key={c.id} className="bg-card border-panel" data-testid={`card-contract-${c.id}`}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <FileSignature className="w-4 h-4 text-sc-blue shrink-0" />
                    <span className="font-semibold text-sc">{c.name}</span>
                  </div>
                  <p className="text-sm text-sc-2 mt-1">{customerName(c.customerId)}</p>
                </div>
                <Badge variant="outline" className={contractStatusClass(c.status)}>{c.status}</Badge>
              </div>
              {c.description && <p className="text-sm text-sc-3">{c.description}</p>}
              <div className="grid grid-cols-2 gap-3 text-sm pt-1">
                <div>
                  <div className="text-sc-3 text-xs uppercase tracking-wide">Value</div>
                  <div className="text-sc">{c.value != null ? money(c.value) : "—"}</div>
                </div>
                <div>
                  <div className="text-sc-3 text-xs uppercase tracking-wide">Renewal</div>
                  <div className="text-sc">{shortDate(c.renewalDate)}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-panel">
                <Button size="sm" variant="outline" className="border-panel text-sc-2" onClick={() => handleRenew(c)} disabled={renewContract.isPending} data-testid={`button-renew-${c.id}`}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Renew 12mo
                </Button>
                {c.status === "Active" ? (
                  <Button size="sm" variant="outline" className="border-panel text-sc-2" onClick={() => setStatus(c, "Paused")} disabled={updateContract.isPending} data-testid={`button-pause-${c.id}`}>
                    <Pause className="w-3.5 h-3.5 mr-1.5" /> Pause
                  </Button>
                ) : c.status === "Paused" ? (
                  <Button size="sm" variant="outline" className="border-panel text-sc-2" onClick={() => setStatus(c, "Active")} disabled={updateContract.isPending} data-testid={`button-resume-${c.id}`}>
                    <Play className="w-3.5 h-3.5 mr-1.5" /> Resume
                  </Button>
                ) : null}
                {c.status !== "Ended" && c.status !== "Expired" && (
                  <Button size="sm" variant="outline" className="border-destructive/30 text-destructive" onClick={() => setStatus(c, "Ended")} disabled={updateContract.isPending} data-testid={`button-end-${c.id}`}>
                    <Ban className="w-3.5 h-3.5 mr-1.5" /> End
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-sc-3" data-testid="empty-contracts">
          {contractsQuery.isLoading ? "Loading contracts…" : "No contracts found."}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreate(); }}>
        <DialogContent className="max-w-lg bg-card border-panel text-sc">
          <DialogHeader className="border-b border-panel pb-4">
            <DialogTitle className="text-lg text-sc flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-sc-blue" /> New Contract
            </DialogTitle>
            <DialogDescription className="text-sc-3">Set up a recurring maintenance agreement.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sc-2">Customer</Label>
              <Select value={fCustomerId} onValueChange={(v) => { setFCustomerId(v); setFLocationId(""); }}>
                <SelectTrigger className="bg-elevated border-panel text-sc" data-testid="select-contract-customer"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sc-2">Location (optional)</Label>
              <Select value={fLocationId} onValueChange={setFLocationId} disabled={!fCustomerId}>
                <SelectTrigger className="bg-elevated border-panel text-sc" data-testid="select-contract-location"><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>{customerLocations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sc-2">Contract name</Label>
              <Input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Annual HVAC Maintenance" className="bg-elevated border-panel text-sc" data-testid="input-contract-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sc-2">Value ($)</Label>
                <Input type="number" value={fValue} onChange={(e) => setFValue(e.target.value)} placeholder="2400" className="bg-elevated border-panel text-sc" data-testid="input-contract-value" />
              </div>
              <div className="space-y-2">
                <Label className="text-sc-2">Labor rate ($/hr)</Label>
                <Input type="number" value={fLaborRate} onChange={(e) => setFLaborRate(e.target.value)} placeholder="120" className="bg-elevated border-panel text-sc" data-testid="input-contract-labor" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sc-2">Start date</Label>
                <Input type="date" value={fStartDate} onChange={(e) => setFStartDate(e.target.value)} className="bg-elevated border-panel text-sc" data-testid="input-contract-start" />
              </div>
              <div className="space-y-2">
                <Label className="text-sc-2">Renewal date</Label>
                <Input type="date" value={fRenewalDate} onChange={(e) => setFRenewalDate(e.target.value)} className="bg-elevated border-panel text-sc" data-testid="input-contract-renewal" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sc-2">Description (optional)</Label>
              <Textarea value={fDescription} onChange={(e) => setFDescription(e.target.value)} placeholder="Scope of coverage…" className="bg-elevated border-panel text-sc" data-testid="input-contract-description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-panel text-sc-2" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="text-white" style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }} onClick={handleCreate} disabled={createContract.isPending} data-testid="button-submit-contract">
              Create Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
