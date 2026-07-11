import { useRoute, useLocation } from "wouter";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { statusClass, billingClass, money, shortDate } from "@/lib/ui";
import { ArrowLeft, Building2, Phone, Mail, MapPin, FileText, AlertTriangle, ShieldCheck, Download, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CustomerDetail() {
  const [, params] = useRoute("/customers/:id");
  const [, navigate] = useLocation();
  const { customers, locations, workOrders, invoices, documents, equipment, users } = useAppStore();

  const c = customers.find((x) => x.id === params?.id);
  if (!c) return (
    <div className="p-6 max-w-5xl mx-auto">
      <Button variant="ghost" onClick={() => navigate("/customers")} className="mb-4 text-sc-2 hover:text-white">
        <ArrowLeft className="w-4 h-4 mr-2" />Back
      </Button>
      <Card className="sc-panel">
        <CardContent className="py-16 text-center text-sc-3">Customer not found.</CardContent>
      </Card>
    </div>
  );

  const sites = locations.filter((l) => l.customerId === c.id);
  const jobs = workOrders.filter((w) => w.customerId === c.id);
  const custInvoices = invoices.filter((i) => i.customerId === c.id);
  const docs = documents.filter((d) => d.customerId === c.id);
  const assets = equipment.filter((e) => e.customerId === c.id);
  const manager = users.find((u) => u.id === c.accountManagerId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button variant="ghost" onClick={() => navigate("/customers")} className="text-sc-2 hover:text-white -ml-4" data-testid="button-back">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Customers
      </Button>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl sc-elevated flex items-center justify-center shrink-0">
            <Building2 className="w-8 h-8 text-sc-blue" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-sc mb-2" data-testid="text-page-title">{c.name}</h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-sc-2">
              <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-sc-3" /> {c.phone}</span>
              <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-sc-3" /> {c.email}</span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded sc-elevated text-sc-2 border border-panel-subtle">
                Mgr: <span className="font-bold text-sc">{manager?.name}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider", c.status === "Active" ? "bg-[rgba(56,212,119,0.1)] text-[color:var(--sc-green)] border-[rgba(56,212,119,0.2)]" : "sc-elevated text-sc-2 border-panel-subtle")}>
                {c.status}
              </Badge>
              {c.tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px] sc-elevated text-sc-2 border border-panel-subtle font-medium">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        
        <Card className="sc-panel shadow-sm min-w-[200px]">
          <CardContent className="p-4 flex flex-col items-end justify-center">
            <div className="text-[10px] font-bold text-sc-3 uppercase tracking-wider mb-1">Outstanding Balance</div>
            <div className={cn("text-3xl font-bold tracking-tight", c.balance > 0 ? "text-[color:var(--sc-orange)]" : "text-sc")}>
              {money(c.balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList className="sc-elevated p-1 border border-panel-subtle" data-testid="tabs-customer">
          <TabsTrigger value="overview" className="data-[state=active]:sc-panel data-[state=active]:shadow-sm data-[state=active]:text-white">Overview</TabsTrigger>
          <TabsTrigger value="sites" className="data-[state=active]:sc-panel data-[state=active]:shadow-sm data-[state=active]:text-white">Sites ({sites.length})</TabsTrigger>
          <TabsTrigger value="jobs" className="data-[state=active]:sc-panel data-[state=active]:shadow-sm data-[state=active]:text-white">Jobs ({jobs.length})</TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:sc-panel data-[state=active]:shadow-sm data-[state=active]:text-white">Invoices ({custInvoices.length})</TabsTrigger>
          <TabsTrigger value="equipment" className="data-[state=active]:sc-panel data-[state=active]:shadow-sm data-[state=active]:text-white">Equipment ({assets.length})</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:sc-panel data-[state=active]:shadow-sm data-[state=active]:text-white">Vault ({docs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="sc-panel shadow-sm">
              <CardHeader className="sc-inner border-b border-panel-subtle py-3">
                <CardTitle className="text-sm font-semibold text-sc">Requirements & Rules</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-sc-3 uppercase tracking-wider mb-3">Service Requirements</h4>
                  <ul className="space-y-2.5 text-sm font-medium text-sc-2">
                    {c.requirements.map((r, i) => (
                      <li key={i} className="flex gap-2.5 items-start">
                        <ShieldCheck className="w-4 h-4 text-sc-blue shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-4 border-t border-panel-subtle">
                  <h4 className="text-xs font-bold text-sc-3 uppercase tracking-wider mb-3">Portal & Billing Rules</h4>
                  <div className="text-sm font-medium text-sc-2 sc-elevated p-3 rounded-md border border-panel-subtle">
                    {c.portalRules}
                  </div>
                  <div className="text-xs font-semibold text-sc-3 mt-3 flex items-center gap-1.5">
                    <span className="uppercase tracking-wider text-sc-3">Tax Code:</span> {c.taxCode}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card className="sc-panel shadow-sm">
                <CardHeader className="sc-inner border-b border-panel-subtle py-3">
                  <CardTitle className="text-sm font-semibold text-sc">Rate Rules</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-[color:var(--sc-line-subtle)]">
                    {c.rateRules.map((r) => (
                      <div key={r.id} className="p-4 hover:bg-white/[0.04] transition-colors">
                        <div className="font-bold text-sc text-sm mb-1.5">{r.label}</div>
                        <div className="flex gap-4 text-sm font-medium text-sc-2 mb-2">
                          <div className="sc-elevated border border-panel-subtle px-2 py-1 rounded">
                            <span className="text-sc-3 text-xs uppercase tracking-wider mr-1.5">Std</span>
                            {money(r.laborRate)}/hr
                          </div>
                          <div className="sc-elevated border border-panel-subtle px-2 py-1 rounded">
                            <span className="text-sc-3 text-xs uppercase tracking-wider mr-1.5">AH</span>
                            {money(r.afterHoursRate)}/hr
                          </div>
                        </div>
                        {r.notes && <div className="text-xs font-medium text-[color:var(--sc-orange)] bg-[rgba(255,157,24,0.1)] inline-block px-2 py-1 rounded border border-[rgba(255,157,24,0.2)]">{r.notes}</div>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="sc-panel shadow-sm">
                <CardHeader className="sc-inner border-b border-panel-subtle py-3">
                  <CardTitle className="text-sm font-semibold text-sc">Key Contacts</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-[color:var(--sc-line-subtle)]">
                    {c.contacts.map((ct) => (
                      <div key={ct.id} className="p-4 hover:bg-white/[0.04] transition-colors flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sc text-sm mb-0.5 flex items-center gap-2">
                            {ct.name} 
                            {ct.primary && <Badge variant="outline" className="text-[9px] uppercase tracking-wider bg-[rgba(67,166,255,0.1)] text-sc-blue border-[rgba(67,166,255,0.2)]">Primary</Badge>}
                          </div>
                          <div className="text-xs font-medium text-sc-3 uppercase tracking-wider mb-1.5">{ct.title}</div>
                          <div className="text-sm font-medium text-sc-2 flex items-center gap-3">
                            <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-sc-3" />{ct.phone}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-sc-3 hover:text-sc-blue">
                          <Mail className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-sc">Document Vault</h2>
              <p className="text-sm text-sc-2">Contracts, compliance, and billing documentation.</p>
            </div>
            <Button size="sm" className="text-white text-xs h-8 blue-glow-soft" style={{ background: 'var(--sc-btn)', border: '1px solid var(--sc-btn-highlight)' }}>
              <Plus className="w-4 h-4 mr-1.5" /> Upload Document
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {docs.map((d) => {
              const statusColors = {
                "Valid": "bg-[rgba(56,212,119,0.1)] text-[color:var(--sc-green)] border-[rgba(56,212,119,0.2)]",
                "Expiring Soon": "bg-[rgba(255,157,24,0.1)] text-[color:var(--sc-orange)] border-[rgba(255,157,24,0.2)]",
                "Expired": "bg-[rgba(255,51,72,0.1)] text-[color:var(--sc-red)] border-[rgba(255,51,72,0.2)]",
                "Missing": "sc-elevated text-sc-3 border-panel-subtle",
              }[d.status] || "sc-elevated text-sc-3 border-panel-subtle";

              return (
                <Card key={d.id} className="sc-panel shadow-sm hover:border-[color:var(--sc-line-active)] transition-colors group">
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded sc-elevated flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-sc-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="font-bold text-sc text-sm truncate">{d.name}</div>
                        <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider shrink-0", statusColors)}>
                          {d.status !== "Valid" && d.status !== "Missing" && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {d.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-sc-3 mb-3">
                        <span className="uppercase tracking-wider">{d.type}</span>
                        <span>·</span>
                        <span>{d.visibility}</span>
                        {d.expiration && (
                          <>
                            <span>·</span>
                            <span className={cn(d.status === "Expiring Soon" ? "text-[color:var(--sc-orange)]" : d.status === "Expired" ? "text-[color:var(--sc-red)]" : "")}>
                              Expires {shortDate(d.expiration)}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs sc-elevated border-panel-subtle text-sc-2 hover:text-white" disabled={d.status === "Missing"}>
                          <Download className="w-3 h-3 mr-1.5" /> Download
                        </Button>
                        {d.status !== "Valid" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-[rgba(67,166,255,0.2)] text-sc-blue bg-[rgba(67,166,255,0.1)] hover:bg-[rgba(67,166,255,0.2)]">
                            Update
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="sites" className="mt-6 space-y-3">
          {sites.map((s) => (
            <Card key={s.id} className="sc-panel shadow-sm hover:border-[color:var(--sc-line-active)] transition-colors">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg sc-elevated flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-sc-3" />
                  </div>
                  <div>
                    <div className="font-bold text-sc text-sm mb-0.5">{s.name}</div>
                    <div className="text-sm font-medium text-sc-2">
                      {s.address}, {s.city}, {s.state} {s.zip}
                    </div>
                    {s.notes && <div className="text-xs font-medium text-sc-2 mt-2 sc-elevated inline-block px-2 py-1 rounded border border-panel-subtle">{s.notes}</div>}
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] sc-elevated border border-panel-subtle uppercase tracking-wider font-bold text-sc-3">{s.region}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="jobs" className="mt-6 space-y-3">
          {jobs.map((j) => (
            <Card key={j.id} className="sc-panel shadow-sm cursor-pointer hover:border-[color:var(--sc-line-active)] transition-colors group" onClick={() => navigate(`/work-orders/${j.id}`)} data-testid={`cust-job-${j.id}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sc-blue text-sm mb-1 group-hover:underline">{j.number}</div>
                  <div className="text-sm font-medium text-sc-2 line-clamp-1">{j.description}</div>
                  <div className="text-xs font-medium text-sc-3 uppercase tracking-wider mt-2 flex items-center gap-2">
                    <span>{j.type}</span>
                    <span>·</span>
                    <span>Due {shortDate(j.dueDate)}</span>
                  </div>
                </div>
                <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider", statusClass(j.status))}>{j.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="invoices" className="mt-6 space-y-3">
          {custInvoices.map((inv) => (
            <Card key={inv.id} className="sc-panel shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sc text-sm mb-1">{inv.number}</div>
                  <div className="text-xs font-medium text-sc-3 uppercase tracking-wider flex items-center gap-2">
                    <span>Issued {inv.issueDate ? shortDate(inv.issueDate) : "—"}</span>
                    <span>·</span>
                    <span className={cn(new Date(inv.dueDate).getTime() < Date.now() && inv.status !== "Paid" ? "text-[color:var(--sc-red)]" : "")}>
                      Due {shortDate(inv.dueDate)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-lg text-sc">{money(inv.amount)}</span>
                  <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider", billingClass(inv.status))}>{inv.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="equipment" className="mt-6 space-y-3">
          {assets.length === 0 ? (
            <Card className="sc-panel shadow-sm">
              <CardContent className="py-12 text-center text-sc-3 font-medium">No equipment assets on file.</CardContent>
            </Card>
          ) : assets.map((e) => (
            <Card key={e.id} className="sc-panel shadow-sm">
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-sc text-sm mb-1">{e.assetName}</div>
                  <div className="text-sm font-medium text-sc-2 mb-2">
                    <span className="text-sc-3 mr-1">Model:</span> {e.model} <span className="mx-2 text-sc-3/50">|</span> <span className="text-sc-3 mr-1">SN:</span> {e.serialNumber}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-medium">
                    <Badge variant="secondary" className="sc-elevated text-sc-2 border border-panel-subtle font-medium">Warranty: {e.warrantyInfo}</Badge>
                    {e.lastServiced && <Badge variant="secondary" className="sc-elevated text-sc-2 border border-panel-subtle font-medium">Last Serviced: {shortDate(e.lastServiced)}</Badge>}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="sc-elevated border-panel-subtle text-sc-2 hover:text-white">Service History</Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

      </Tabs>
    </div>
  );
}
