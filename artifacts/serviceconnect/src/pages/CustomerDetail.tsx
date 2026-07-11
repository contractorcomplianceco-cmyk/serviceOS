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
      <Button variant="ghost" onClick={() => navigate("/customers")} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />Back
      </Button>
      <Card>
        <CardContent className="py-16 text-center text-slate-500">Customer not found.</CardContent>
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
      <Button variant="ghost" onClick={() => navigate("/customers")} className="text-slate-500 hover:text-slate-900 -ml-4" data-testid="button-back">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Customers
      </Button>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2" data-testid="text-page-title">{c.name}</h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-slate-500">
              <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-400" /> {c.phone}</span>
              <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-400" /> {c.email}</span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                Mgr: <span className="font-bold text-slate-900">{manager?.name}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider", c.status === "Active" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200")}>
                {c.status}
              </Badge>
              {c.tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px] bg-white text-slate-600 border border-slate-200 font-medium">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        
        <Card className="border border-slate-200/60 shadow-sm bg-white min-w-[200px]">
          <CardContent className="p-4 flex flex-col items-end justify-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Outstanding Balance</div>
            <div className={cn("text-3xl font-bold tracking-tight", c.balance > 0 ? "text-amber-600" : "text-slate-900")}>
              {money(c.balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList className="bg-slate-100/50 p-1 border border-slate-200" data-testid="tabs-customer">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
          <TabsTrigger value="sites" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Sites ({sites.length})</TabsTrigger>
          <TabsTrigger value="jobs" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Jobs ({jobs.length})</TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Invoices ({custInvoices.length})</TabsTrigger>
          <TabsTrigger value="equipment" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Equipment ({assets.length})</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Vault ({docs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="border border-slate-200/60 shadow-sm bg-white">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
                <CardTitle className="text-sm font-semibold text-slate-800">Requirements & Rules</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Service Requirements</h4>
                  <ul className="space-y-2.5 text-sm font-medium text-slate-700">
                    {c.requirements.map((r, i) => (
                      <li key={i} className="flex gap-2.5 items-start">
                        <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Portal & Billing Rules</h4>
                  <div className="text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-md border border-slate-100">
                    {c.portalRules}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-3 flex items-center gap-1.5">
                    <span className="uppercase tracking-wider text-slate-400">Tax Code:</span> {c.taxCode}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card className="border border-slate-200/60 shadow-sm bg-white">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
                  <CardTitle className="text-sm font-semibold text-slate-800">Rate Rules</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {c.rateRules.map((r) => (
                      <div key={r.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="font-bold text-slate-900 text-sm mb-1.5">{r.label}</div>
                        <div className="flex gap-4 text-sm font-medium text-slate-600 mb-2">
                          <div className="bg-white border border-slate-200 px-2 py-1 rounded">
                            <span className="text-slate-400 text-xs uppercase tracking-wider mr-1.5">Std</span>
                            {money(r.laborRate)}/hr
                          </div>
                          <div className="bg-white border border-slate-200 px-2 py-1 rounded">
                            <span className="text-slate-400 text-xs uppercase tracking-wider mr-1.5">AH</span>
                            {money(r.afterHoursRate)}/hr
                          </div>
                        </div>
                        {r.notes && <div className="text-xs font-medium text-amber-600 bg-amber-50 inline-block px-2 py-1 rounded border border-amber-100">{r.notes}</div>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200/60 shadow-sm bg-white">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
                  <CardTitle className="text-sm font-semibold text-slate-800">Key Contacts</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {c.contacts.map((ct) => (
                      <div key={ct.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 text-sm mb-0.5 flex items-center gap-2">
                            {ct.name} 
                            {ct.primary && <Badge variant="outline" className="text-[9px] uppercase tracking-wider bg-primary/5 text-primary border-primary/20">Primary</Badge>}
                          </div>
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">{ct.title}</div>
                          <div className="text-sm font-medium text-slate-600 flex items-center gap-3">
                            <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" />{ct.phone}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary">
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
              <h2 className="text-lg font-bold text-slate-900">Document Vault</h2>
              <p className="text-sm text-slate-500">Contracts, compliance, and billing documentation.</p>
            </div>
            <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800">
              <Plus className="w-4 h-4 mr-1.5" /> Upload Document
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {docs.map((d) => {
              const statusColors = {
                "Valid": "bg-emerald-50 text-emerald-600 border-emerald-200",
                "Expiring Soon": "bg-amber-50 text-amber-600 border-amber-200",
                "Expired": "bg-destructive/10 text-destructive border-destructive/20",
                "Missing": "bg-slate-100 text-slate-500 border-slate-200",
              }[d.status] || "bg-slate-50 text-slate-500 border-slate-200";

              return (
                <Card key={d.id} className="border border-slate-200/60 shadow-sm bg-white hover:border-primary/30 transition-colors group">
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="font-bold text-slate-900 text-sm truncate">{d.name}</div>
                        <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider shrink-0", statusColors)}>
                          {d.status !== "Valid" && d.status !== "Missing" && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {d.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500 mb-3">
                        <span className="uppercase tracking-wider">{d.type}</span>
                        <span>·</span>
                        <span>{d.visibility}</span>
                        {d.expiration && (
                          <>
                            <span>·</span>
                            <span className={cn(d.status === "Expiring Soon" ? "text-amber-600" : d.status === "Expired" ? "text-destructive" : "")}>
                              Expires {shortDate(d.expiration)}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs bg-white" disabled={d.status === "Missing"}>
                          <Download className="w-3 h-3 mr-1.5" /> Download
                        </Button>
                        {d.status !== "Valid" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-primary/20 text-primary bg-primary/5 hover:bg-primary/10">
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
            <Card key={s.id} className="border border-slate-200/60 shadow-sm bg-white hover:border-slate-300 transition-colors">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm mb-0.5">{s.name}</div>
                    <div className="text-sm font-medium text-slate-500">
                      {s.address}, {s.city}, {s.state} {s.zip}
                    </div>
                    {s.notes && <div className="text-xs font-medium text-slate-600 mt-2 bg-slate-50 inline-block px-2 py-1 rounded border border-slate-100">{s.notes}</div>}
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] bg-white border border-slate-200 uppercase tracking-wider font-bold text-slate-500">{s.region}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="jobs" className="mt-6 space-y-3">
          {jobs.map((j) => (
            <Card key={j.id} className="border border-slate-200/60 shadow-sm bg-white cursor-pointer hover:border-primary/50 transition-colors group" onClick={() => navigate(`/work-orders/${j.id}`)} data-testid={`cust-job-${j.id}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold text-primary text-sm mb-1 group-hover:underline">{j.number}</div>
                  <div className="text-sm font-medium text-slate-600 line-clamp-1">{j.description}</div>
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-2 flex items-center gap-2">
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
            <Card key={inv.id} className="border border-slate-200/60 shadow-sm bg-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm mb-1">{inv.number}</div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <span>Issued {inv.issueDate ? shortDate(inv.issueDate) : "—"}</span>
                    <span>·</span>
                    <span className={cn(new Date(inv.dueDate).getTime() < Date.now() && inv.status !== "Paid" ? "text-destructive" : "")}>
                      Due {shortDate(inv.dueDate)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-lg text-slate-900">{money(inv.amount)}</span>
                  <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider", billingClass(inv.status))}>{inv.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="equipment" className="mt-6 space-y-3">
          {assets.length === 0 ? (
            <Card className="border border-slate-200/60 shadow-sm bg-white">
              <CardContent className="py-12 text-center text-slate-500 font-medium">No equipment assets on file.</CardContent>
            </Card>
          ) : assets.map((e) => (
            <Card key={e.id} className="border border-slate-200/60 shadow-sm bg-white">
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-slate-900 text-sm mb-1">{e.assetName}</div>
                  <div className="text-sm font-medium text-slate-600 mb-2">
                    <span className="text-slate-400 mr-1">Model:</span> {e.model} <span className="mx-2 text-slate-300">|</span> <span className="text-slate-400 mr-1">SN:</span> {e.serialNumber}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-medium">
                    <Badge variant="secondary" className="bg-slate-50 text-slate-600 border border-slate-100 font-medium">Warranty: {e.warrantyInfo}</Badge>
                    {e.lastServiced && <Badge variant="secondary" className="bg-slate-50 text-slate-600 border border-slate-100 font-medium">Last Serviced: {shortDate(e.lastServiced)}</Badge>}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="bg-white">Service History</Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

      </Tabs>
    </div>
  );
}
