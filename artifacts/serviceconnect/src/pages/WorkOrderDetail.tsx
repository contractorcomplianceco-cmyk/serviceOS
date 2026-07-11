import { useRoute, useLocation } from "wouter";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { priorityClass, statusClass, portalClass, billingClass, money, shortDate } from "@/lib/ui";
import { ArrowLeft, MapPin, Building2, Truck, CheckCircle2, AlertTriangle, Send, FileText } from "lucide-react";

export default function WorkOrderDetail() {
  const [, params] = useRoute("/work-orders/:id");
  const [, navigate] = useLocation();
  const { workOrders, customers, locations, users, currentUser, updateWorkOrder } = useAppStore();
  const { toast } = useToast();

  const wo = workOrders.find((w) => w.id === params?.id);
  if (!wo) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/work-orders")} className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        <Card><CardContent className="py-16 text-center text-muted-foreground">Work order not found.</CardContent></Card>
      </div>
    );
  }

  const customer = customers.find((c) => c.id === wo.customerId);
  const location = locations.find((l) => l.id === wo.locationId);
  const tech = users.find((u) => u.id === wo.assignedTechnicianId);
  const techs = users.filter((u) => u.role === "Technician" || u.role === "Lead Technician");
  const canManage = ["Administrator", "Scheduler", "Service Manager", "Lead Technician"].includes(currentUser.role);

  const laborTotal = wo.labor.reduce((s, l) => s + l.hours * l.rate, 0);
  const materialTotal = wo.materials.reduce((s, m) => s + m.quantity * m.billablePrice, 0);

  const assign = (techId: string) => {
    updateWorkOrder(wo.id, { assignedTechnicianId: techId, status: wo.status === "Need Scheduled" || wo.status === "New" || wo.status === "Triage Needed" ? "Scheduled" : wo.status });
    toast({ title: "Technician assigned", description: `${users.find((u) => u.id === techId)?.name} assigned. Customer not notified until you approve the portal update.` });
  };

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <Button variant="ghost" onClick={() => navigate("/work-orders")} className="text-muted-foreground" data-testid="button-back"><ArrowLeft className="w-4 h-4 mr-2" /> Work Orders</Button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">{wo.number}</h1>
            <Badge variant="outline" className={priorityClass(wo.priority)}>{wo.priority}</Badge>
            <Badge variant="outline" className={statusClass(wo.status)}>{wo.status}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">{wo.type} · {wo.region} · Source: {wo.source}</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Select value={wo.status} onValueChange={(v) => updateWorkOrder(wo.id, { status: v as typeof wo.status })}>
              <SelectTrigger className="w-[210px] bg-white" data-testid="select-wo-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["New", "Triage Needed", "Need Scheduled", "Scheduled", "On Site", "Awaiting Materials", "Awaiting Quote Approval", "Completed Pending Review", "Ready for Billing", "Invoiced", "Closed"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {wo.importantNotes && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <div><span className="font-semibold">Important:</span> {wo.importantNotes}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1"><Building2 className="w-3.5 h-3.5" /> Customer</div>
          <button onClick={() => navigate(`/customers/${customer?.id}`)} className="font-semibold text-primary hover:underline" data-testid="link-customer">{customer?.name}</button>
          <div className="text-sm text-muted-foreground">{customer?.phone}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1"><MapPin className="w-3.5 h-3.5" /> Location</div>
          <div className="font-semibold">{location?.name}</div>
          <div className="text-sm text-muted-foreground">{location?.address}, {location?.city}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1"><Truck className="w-3.5 h-3.5" /> Assigned Tech</div>
          {tech ? <div className="font-semibold">{tech.name}</div> : <div className="text-sm text-amber-600">Unassigned</div>}
          <div className="text-sm text-muted-foreground">Due {shortDate(wo.dueDate)} · {wo.timeWindow ?? "No window"}</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList data-testid="tabs-wo">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trips">Trips ({wo.trips.length})</TabsTrigger>
          <TabsTrigger value="billing">Labor & Materials</TabsTrigger>
          <TabsTrigger value="portal">Portal Sync</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-slate-700">{wo.description}</p>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <Info label="PO Number" value={wo.poNumber} />
                <Info label="Reference #" value={wo.referenceNumber} />
                <Info label="External ID" value={wo.externalId} />
                <Info label="Billing Status" value={wo.billingStatus} />
              </div>
              {wo.locationNotes && <div className="pt-2 border-t"><span className="text-xs text-muted-foreground uppercase tracking-wider">Location Notes</span><p className="mt-1">{wo.locationNotes}</p></div>}
              {wo.quoteNotes && <div className="pt-2 border-t bg-amber-500/5 -mx-6 px-6 py-2"><span className="text-xs text-amber-600 uppercase tracking-wider font-medium">Quote — Awaiting Approval</span><p className="mt-1">{wo.quoteNotes}</p></div>}
            </CardContent>
          </Card>
          {!tech && canManage && (
            <Card className="border-primary/30">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-slate-900">Assign a technician</div>
                  <div className="text-sm text-muted-foreground">RoseOS suggests {techs[0]?.name} based on skills and drive time.</div>
                </div>
                <Select onValueChange={assign}>
                  <SelectTrigger className="w-[200px] bg-white" data-testid="select-assign-tech"><SelectValue placeholder="Select technician" /></SelectTrigger>
                  <SelectContent>{techs.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} · {t.zone}</SelectItem>)}</SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trips" className="space-y-3 mt-4">
          {wo.trips.length === 0 ? <EmptyBox text="No trips logged yet." /> : wo.trips.map((t) => {
            const tt = users.find((u) => u.id === t.technicianId);
            return (
              <Card key={t.id} data-testid={`trip-${t.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">Trip {t.tripNumber} · {tt?.name}</div>
                    <span className="text-sm text-muted-foreground">{shortDate(t.date)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                    <Info label="Check In" value={t.checkIn} />
                    <Info label="Check Out" value={t.checkOut} />
                  </div>
                  {t.workPerformed && <p className="text-sm mt-2 text-slate-700">{t.workPerformed}</p>}
                  {t.returnTripReason && <div className="mt-2 text-sm text-amber-700 bg-amber-500/10 rounded px-2 py-1">Return trip: {t.returnTripReason}</div>}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="billing" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Labor</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {wo.labor.length === 0 ? <p className="text-sm text-muted-foreground">No labor logged.</p> : wo.labor.map((l) => {
                const lt = users.find((u) => u.id === l.technicianId);
                return (
                  <div key={l.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <div>{lt?.name} · {l.hours} hrs · {l.type}</div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{money(l.hours * l.rate)}</span>
                      {l.approved ? <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Approved</Badge> : <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">Pending</Badge>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Materials</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {wo.materials.length === 0 ? <p className="text-sm text-muted-foreground">No materials logged.</p> : wo.materials.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <div>{m.name} · qty {m.quantity}</div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{money(m.quantity * m.billablePrice)}</span>
                    {m.approved ? <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Approved</Badge> : <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">Pending</Badge>}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 mt-2 border-t font-semibold">
                <span>Estimated Total</span><span className="text-primary">{money(laborTotal + materialTotal)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portal" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Customer Portal Sync</CardTitle>
              <Badge variant="outline" className={portalClass(wo.portalSyncStatus)}>{wo.portalSyncStatus}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">{customer?.portalRules}</div>
              <div className="bg-slate-50 border rounded-lg p-4 text-sm">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Draft update (not sent)</div>
                <p>Status: {wo.status}. {tech ? `Assigned to ${tech.name}.` : "Pending assignment."} Next update on completion.</p>
              </div>
              {canManage ? (
                <div className="flex gap-2">
                  <Button className="bg-primary text-white" onClick={() => { updateWorkOrder(wo.id, { portalSyncStatus: "Sent" }); toast({ title: "Portal update sent", description: "You approved and sent this update to the customer portal." }); }} data-testid="button-approve-portal">
                    <Send className="w-4 h-4 mr-2" /> Approve & Send Update
                  </Button>
                  <Button variant="outline" data-testid="button-copy-manual"><FileText className="w-4 h-4 mr-2" /> Copy for Manual Portal</Button>
                </div>
              ) : (
                <div className="text-sm text-amber-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Portal updates require manager approval.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Internal Activity Log</CardTitle></CardHeader>
            <CardContent>
              {wo.internalLog.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : (
                <div className="space-y-3">
                  {wo.internalLog.map((e) => (
                    <div key={e.id} className="flex gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <div className="text-slate-700">{e.message}</div>
                        <div className="text-xs text-muted-foreground">{e.author} · {shortDate(e.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {wo.billingStatus === "Ready for Invoice" && (
                <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 className="w-4 h-4" /> This job is approved and ready for billing.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-sm text-slate-800">{value || "—"}</div>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return <Card><CardContent className="py-12 text-center text-muted-foreground">{text}</CardContent></Card>;
}
