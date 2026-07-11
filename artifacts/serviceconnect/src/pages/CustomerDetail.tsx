import { useRoute, useLocation } from "wouter";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { statusClass, billingClass, money, shortDate } from "@/lib/ui";
import { ArrowLeft, Building2, Phone, Mail, MapPin, FileText, AlertTriangle } from "lucide-react";

export default function CustomerDetail() {
  const [, params] = useRoute("/customers/:id");
  const [, navigate] = useLocation();
  const { customers, locations, workOrders, invoices, documents, equipment, users } = useAppStore();

  const c = customers.find((x) => x.id === params?.id);
  if (!c) return <div className="p-6 max-w-5xl mx-auto"><Button variant="ghost" onClick={() => navigate("/customers")}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button><Card><CardContent className="py-16 text-center text-muted-foreground">Customer not found.</CardContent></Card></div>;

  const sites = locations.filter((l) => l.customerId === c.id);
  const jobs = workOrders.filter((w) => w.customerId === c.id);
  const custInvoices = invoices.filter((i) => i.customerId === c.id);
  const docs = documents.filter((d) => d.customerId === c.id);
  const assets = equipment.filter((e) => e.customerId === c.id);
  const manager = users.find((u) => u.id === c.accountManagerId);

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <Button variant="ghost" onClick={() => navigate("/customers")} className="text-muted-foreground" data-testid="button-back"><ArrowLeft className="w-4 h-4 mr-2" /> Customers</Button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="w-7 h-7 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">{c.name}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {c.phone}</span>
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {c.email}</span>
              <span>Account Mgr: {manager?.name}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Outstanding Balance</div>
          <div className={`text-2xl font-bold ${c.balance > 0 ? "text-amber-600" : "text-slate-900"}`}>{money(c.balance)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {c.tags.map((t) => <Badge key={t} variant="secondary" className="bg-slate-100">{t}</Badge>)}
      </div>

      <Tabs defaultValue="overview">
        <TabsList data-testid="tabs-customer">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sites">Sites ({sites.length})</TabsTrigger>
          <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({custInvoices.length})</TabsTrigger>
          <TabsTrigger value="equipment">Equipment ({assets.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({docs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle className="text-base">Requirements</CardTitle></CardHeader><CardContent><ul className="space-y-2 text-sm">{c.requirements.map((r, i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span> {r}</li>)}</ul></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Rate Rules</CardTitle></CardHeader><CardContent className="space-y-3">{c.rateRules.map((r) => (<div key={r.id} className="text-sm"><div className="font-medium">{r.label}</div><div className="text-muted-foreground">Standard {money(r.laborRate)}/hr · After-hours {money(r.afterHoursRate)}/hr</div>{r.notes && <div className="text-xs text-amber-600 mt-1">{r.notes}</div>}</div>))}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Contacts</CardTitle></CardHeader><CardContent className="space-y-2">{c.contacts.map((ct) => (<div key={ct.id} className="text-sm"><div className="font-medium">{ct.name} {ct.primary && <Badge variant="outline" className="text-[10px] ml-1">Primary</Badge>}</div><div className="text-muted-foreground">{ct.title} · {ct.phone}</div></div>))}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Portal & Billing Rules</CardTitle></CardHeader><CardContent className="text-sm space-y-2"><div>{c.portalRules}</div><div className="text-muted-foreground">Tax code: {c.taxCode}</div></CardContent></Card>
        </TabsContent>

        <TabsContent value="sites" className="mt-4 space-y-2">
          {sites.map((s) => (
            <Card key={s.id}><CardContent className="p-4 flex items-center justify-between"><div><div className="font-medium">{s.name}</div><div className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.address}, {s.city}, {s.state} {s.zip}</div>{s.notes && <div className="text-xs text-muted-foreground mt-1">{s.notes}</div>}</div><Badge variant="secondary">{s.region}</Badge></CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="jobs" className="mt-4 space-y-2">
          {jobs.map((j) => (
            <Card key={j.id} className="cursor-pointer hover:border-primary" onClick={() => navigate(`/work-orders/${j.id}`)} data-testid={`cust-job-${j.id}`}><CardContent className="p-4 flex items-center justify-between"><div><div className="font-medium text-primary">{j.number}</div><div className="text-sm text-muted-foreground">{j.description}</div></div><Badge variant="outline" className={statusClass(j.status)}>{j.status}</Badge></CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="invoices" className="mt-4 space-y-2">
          {custInvoices.map((inv) => (
            <Card key={inv.id}><CardContent className="p-4 flex items-center justify-between"><div><div className="font-medium">{inv.number}</div><div className="text-sm text-muted-foreground">Due {shortDate(inv.dueDate)}</div></div><div className="flex items-center gap-3"><span className="font-semibold">{money(inv.amount)}</span><Badge variant="outline" className={billingClass(inv.status)}>{inv.status}</Badge></div></CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="equipment" className="mt-4 space-y-2">
          {assets.length === 0 ? <Card><CardContent className="py-10 text-center text-muted-foreground">No equipment on file.</CardContent></Card> : assets.map((e) => (
            <Card key={e.id}><CardContent className="p-4"><div className="font-medium">{e.assetName}</div><div className="text-sm text-muted-foreground">{e.model} · SN {e.serialNumber}</div><div className="text-xs text-muted-foreground mt-1">{e.warrantyInfo} · Last serviced {shortDate(e.lastServiced)}</div></CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="documents" className="mt-4 space-y-2">
          {docs.map((d) => (
            <Card key={d.id}><CardContent className="p-4 flex items-center justify-between"><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" /><div><div className="font-medium">{d.name}</div><div className="text-xs text-muted-foreground">{d.type} · {d.visibility}{d.expiration ? ` · Expires ${shortDate(d.expiration)}` : ""}</div></div></div><Badge variant="outline" className={d.status === "Valid" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : d.status === "Expiring Soon" ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-destructive/10 text-destructive border-destructive/20"}>{d.status !== "Valid" && <AlertTriangle className="w-3 h-3 mr-1" />}{d.status}</Badge></CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
