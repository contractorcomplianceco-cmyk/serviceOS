import { useRoute, useLocation } from "wouter";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { priorityClass, statusClass, portalClass, money, shortDate, billingClass } from "@/lib/ui";
import { ArrowLeft, MapPin, Building2, Truck, CheckCircle2, AlertTriangle, Send, FileText, Calendar, Clock, DollarSign, PenTool, Phone, Receipt, Wrench, FileCheck, Check, Edit2, Sparkles, Activity } from "lucide-react";

export default function WorkOrderDetail() {
  const [, params] = useRoute("/work-orders/:id");
  const [, navigate] = useLocation();
  const { workOrders, customers, locations, users, currentUser, updateWorkOrder, recommendations, dismissRecommendation } = useAppStore();
  const { toast } = useToast();

  const wo = workOrders.find((w) => w.id === params?.id);
  if (!wo) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/work-orders")} className="mb-4 text-slate-500 hover:text-slate-900"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        <Card className="border-slate-200 shadow-sm"><CardContent className="py-20 flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-12 h-12 text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900">Work order not found</h2>
          <p className="text-slate-500 mt-2">The requested work order does not exist or has been removed.</p>
        </CardContent></Card>
      </div>
    );
  }

  const customer = customers.find((c) => c.id === wo.customerId);
  const location = locations.find((l) => l.id === wo.locationId);
  const tech = users.find((u) => u.id === wo.assignedTechnicianId);
  const techs = users.filter((u) => u.role === "Technician" || u.role === "Lead Technician");
  const canManage = ["Administrator", "Scheduler", "Service Manager", "Lead Technician"].includes(currentUser.role);
  const woRecommendations = recommendations.filter(r => r.relatedEntityId === wo.id);

  const laborTotal = wo.labor.reduce((s, l) => s + l.hours * l.rate, 0);
  const materialTotal = wo.materials.reduce((s, m) => s + m.quantity * m.billablePrice, 0);

  const assign = (techId: string) => {
    updateWorkOrder(wo.id, { assignedTechnicianId: techId, status: wo.status === "Need Scheduled" || wo.status === "New" || wo.status === "Triage Needed" ? "Scheduled" : wo.status });
    toast({ title: "Technician assigned", description: `${users.find((u) => u.id === techId)?.name} assigned. Customer not notified until you approve the portal update.` });
  };

  const handleAct = (recId: string) => {
    toast({ title: "Action approved", description: "RoseOS drafted action has been applied." });
    dismissRecommendation(recId);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Strip */}
      <div className="flex items-center text-sm font-medium text-slate-500 mb-2">
        <button onClick={() => navigate("/work-orders")} className="hover:text-slate-900 transition-colors flex items-center" data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Work Orders
        </button>
        <span className="mx-2 text-slate-300">/</span>
        <span className="text-slate-900">{wo.number}</span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">{wo.number}</h1>
            <Badge variant="outline" className={`${priorityClass(wo.priority)} px-2.5 py-0.5 text-xs`}>{wo.priority}</Badge>
            <Badge variant="outline" className={`${statusClass(wo.status)} px-2.5 py-0.5 text-xs`}>{wo.status}</Badge>
            {wo.materialsFlag && <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] uppercase font-bold tracking-wider">Materials</Badge>}
            {wo.quoteFlag && <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] uppercase font-bold tracking-wider">Quote Req</Badge>}
          </div>
          <p className="text-slate-500 text-sm font-medium">
            {wo.type} · {wo.region} · Source: <span className="text-slate-700">{wo.source}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          {canManage && (
            <Select value={wo.status} onValueChange={(v) => updateWorkOrder(wo.id, { status: v as typeof wo.status })}>
              <SelectTrigger className="w-full lg:w-[220px] bg-white border-slate-200 shadow-sm font-medium" data-testid="select-wo-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["New", "Triage Needed", "Need Scheduled", "Scheduled", "First Trip", "On Site", "Awaiting Materials", "Awaiting Quote Approval", "Return Trip Needed", "Completed Pending Review", "Ready for Billing", "Invoiced", "Closed", "Cancelled"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {wo.importantNotes && (
        <div className="flex items-start gap-3 bg-destructive/5 border border-destructive/20 rounded-xl px-5 py-4 text-sm text-destructive/90 shadow-sm">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="font-bold tracking-tight uppercase text-xs">Important / Hazard</h4>
            <p className="font-medium">{wo.importantNotes}</p>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Left Column: Core Job Details */}
        <div className="xl:col-span-1 space-y-6">
          <Card className="border-slate-200/60 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 py-3 px-4 border-b border-slate-100">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Customer & Location
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-5">
              <div>
                <button onClick={() => navigate(`/customers/${customer?.id}`)} className="font-bold text-primary hover:underline text-base" data-testid="link-customer">{customer?.name}</button>
                <div className="text-sm text-slate-500 mt-1 flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {customer?.phone}</div>
              </div>
              <div className="h-px bg-slate-100" />
              <div>
                <div className="font-semibold text-slate-900 text-sm">{location?.name}</div>
                <div className="text-sm text-slate-500 mt-1 flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /> 
                  <span>{location?.address}<br/>{location?.city}, {location?.state} {location?.zip}</span>
                </div>
              </div>
              {wo.locationNotes && (
                <div className="bg-amber-50 rounded-md p-2.5 text-xs text-amber-800 border border-amber-100">
                  <span className="font-semibold uppercase tracking-wider text-[10px] block mb-1">Location Notes</span>
                  {wo.locationNotes}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 py-3 px-4 border-b border-slate-100">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Truck className="w-4 h-4" /> Schedule & Tech
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Assigned To</div>
                {tech ? (
                  <div className="font-semibold text-slate-900">{tech.name}</div>
                ) : (
                  <div className="font-medium text-amber-600 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Unassigned</div>
                )}
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Due Date</div>
                <div className="font-medium text-slate-900 flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /> {shortDate(wo.dueDate)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Time Window</div>
                <div className="font-medium text-slate-900 flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> {wo.timeWindow ?? "Flexible"}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 py-3 px-4 border-b border-slate-100">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Receipt className="w-4 h-4" /> Accounting References
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <InfoRow label="PO Number" value={wo.poNumber} />
              <InfoRow label="Reference #" value={wo.referenceNumber} />
              <InfoRow label="External ID" value={wo.externalId} />
              <div className="pt-2">
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1.5">Billing Status</div>
                <Badge variant="outline" className={billingClass(wo.billingStatus)}>{wo.billingStatus}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column: Main Content Tabs */}
        <div className="xl:col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start h-12 bg-transparent border-b border-slate-200 rounded-none p-0 space-x-6 overflow-x-auto overflow-y-hidden" data-testid="tabs-wo">
              <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3 font-semibold text-slate-500 data-[state=active]:text-primary h-full">Overview</TabsTrigger>
              <TabsTrigger value="trips" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3 font-semibold text-slate-500 data-[state=active]:text-primary h-full">Trips <Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-600 text-[10px]">{wo.trips.length}</Badge></TabsTrigger>
              <TabsTrigger value="labor" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3 font-semibold text-slate-500 data-[state=active]:text-primary h-full">Labor & Materials</TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3 font-semibold text-slate-500 data-[state=active]:text-primary h-full">Activity History</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="overview" className="space-y-6 m-0 animate-in fade-in duration-300">
                <Card className="border-slate-200/60 shadow-sm">
                  <CardHeader className="pb-3"><CardTitle className="text-lg">Job Description</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{wo.description}</p>
                    
                    {wo.quoteNotes && (
                      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-amber-700 font-bold text-sm uppercase tracking-wider mb-2">
                          <DollarSign className="w-4 h-4" /> Quote Awaiting Approval
                        </div>
                        <p className="text-sm text-amber-800">{wo.quoteNotes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {!tech && canManage && (
                  <Card className="border-primary/40 bg-primary/5 shadow-sm">
                    <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-slate-900 text-base flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" /> Assign Technician
                        </div>
                        <div className="text-sm text-slate-600 mt-1">RoseOS suggests <span className="font-semibold text-primary">{techs[0]?.name}</span> based on skills and drive time.</div>
                      </div>
                      <Select onValueChange={assign}>
                        <SelectTrigger className="w-full sm:w-[240px] bg-white border-primary/20 shadow-sm" data-testid="select-assign-tech">
                          <SelectValue placeholder="Select technician..." />
                        </SelectTrigger>
                        <SelectContent>
                          {techs.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} · {t.zone}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                )}

                {wo.attachments.length > 0 && (
                  <Card className="border-slate-200/60 shadow-sm">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">Attachments</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {wo.attachments.map(a => (
                          <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer group">
                            <div className="w-10 h-10 rounded bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate group-hover:text-primary transition-colors">{a.name}</p>
                              <p className="text-xs text-slate-500">{shortDate(a.date)} · {a.uploadedBy}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="trips" className="space-y-4 m-0 animate-in fade-in duration-300">
                {wo.trips.length === 0 ? <EmptyState icon={Truck} title="No trips logged yet" description="Technicians haven't started work on this job." /> : 
                  wo.trips.map((t) => {
                    const tt = users.find((u) => u.id === t.technicianId);
                    return (
                      <Card key={t.id} className="border-slate-200/60 shadow-sm" data-testid={`trip-${t.id}`}>
                        <CardHeader className="bg-slate-50/50 py-3 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">Trip {t.tripNumber}</Badge>
                            <span className="font-semibold text-slate-900 text-sm">{tt?.name}</span>
                          </div>
                          <span className="text-sm font-medium text-slate-500">{shortDate(t.date)}</span>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                          <div className="flex flex-wrap gap-6">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><Check className="w-4 h-4" /></div>
                              <div>
                                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Check In</div>
                                <div className="font-medium text-slate-900 text-sm">{t.checkIn || "—"}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"><Clock className="w-4 h-4" /></div>
                              <div>
                                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Check Out</div>
                                <div className="font-medium text-slate-900 text-sm">{t.checkOut || "—"}</div>
                              </div>
                            </div>
                          </div>
                          
                          {t.workPerformed && (
                            <div className="pt-2">
                              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">Work Performed</div>
                              <p className="text-sm text-slate-700 bg-slate-50 rounded-md p-3 border border-slate-100 leading-relaxed">{t.workPerformed}</p>
                            </div>
                          )}
                          
                          {t.returnTripReason && (
                            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-md p-3">
                              <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs uppercase tracking-wider mb-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Return Trip Required
                              </div>
                              <p className="text-sm text-amber-800">{t.returnTripReason}</p>
                              {t.materialsNeeded && <p className="text-xs text-amber-700/80 mt-1 font-medium">Needs: {t.materialsNeeded}</p>}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                }
              </TabsContent>

              <TabsContent value="labor" className="space-y-6 m-0 animate-in fade-in duration-300">
                <Card className="border-slate-200/60 shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4"><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> Labor Entries</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    {wo.labor.length === 0 ? <div className="p-6 text-center text-sm text-slate-500">No labor logged.</div> : (
                      <div className="divide-y divide-slate-100">
                        {wo.labor.map((l) => {
                          const lt = users.find((u) => u.id === l.technicianId);
                          return (
                            <div key={l.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 hover:bg-slate-50/50 transition-colors">
                              <div>
                                <div className="font-semibold text-slate-900 text-sm">{lt?.name}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{shortDate(l.date)} · {l.type} rate</div>
                              </div>
                              <div className="flex items-center gap-4 sm:justify-end">
                                <div className="text-right">
                                  <div className="font-bold text-slate-900 text-sm">{money(l.hours * l.rate)}</div>
                                  <div className="text-xs text-slate-500">{l.hours} hrs @ ${l.rate}/hr</div>
                                </div>
                                {l.approved ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] uppercase">Approved</Badge> : <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] uppercase">Pending</Badge>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200/60 shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4"><CardTitle className="text-base flex items-center gap-2"><Wrench className="w-4 h-4 text-slate-400" /> Materials Used</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    {wo.materials.length === 0 ? <div className="p-6 text-center text-sm text-slate-500">No materials logged.</div> : (
                      <div className="divide-y divide-slate-100">
                        {wo.materials.map((m) => (
                          <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 hover:bg-slate-50/50 transition-colors">
                            <div>
                              <div className="font-semibold text-slate-900 text-sm">{m.name}</div>
                              <div className="text-xs text-slate-500 mt-0.5">Qty: {m.quantity}</div>
                            </div>
                            <div className="flex items-center gap-4 sm:justify-end">
                              <div className="text-right">
                                <div className="font-bold text-slate-900 text-sm">{money(m.quantity * m.billablePrice)}</div>
                                <div className="text-xs text-slate-500">${m.billablePrice} ea</div>
                              </div>
                              {m.approved ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] uppercase">Approved</Badge> : <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] uppercase">Pending</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                  <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
                    <span className="font-semibold text-slate-700 uppercase tracking-wider text-xs">Estimated Job Total</span>
                    <span className="font-bold text-primary text-lg">{money(laborTotal + materialTotal)}</span>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="m-0 animate-in fade-in duration-300">
                <Card className="border-slate-200/60 shadow-sm">
                  <CardContent className="p-6">
                    {wo.internalLog.length === 0 ? <div className="text-center text-sm text-slate-500">No activity yet.</div> : (
                      <div className="relative space-y-6 before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                        {wo.internalLog.map((e, i) => (
                          <div key={e.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-slate-200 group-[.is-active]:bg-primary text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
                            <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-semibold text-slate-900 text-sm">{e.author}</div>
                                <time className="text-xs text-slate-500 font-medium">{shortDate(e.timestamp)}</time>
                              </div>
                              <div className="text-sm text-slate-600 leading-relaxed">{e.message}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right Column: AI & Portal */}
        <div className="xl:col-span-1 space-y-6">
          {woRecommendations.length > 0 && (
            <Card className="border-0 bg-slate-900 text-slate-100 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
              <CardHeader className="border-b border-slate-800/50 pb-3 relative z-10">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> RoseOS Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 relative z-10">
                {woRecommendations.map((rec) => (
                  <div key={rec.id} className="bg-slate-800/80 border border-slate-700 rounded-lg p-3.5 group hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <Badge variant="outline" className="bg-slate-900 text-slate-300 border-slate-700 text-[9px] font-mono px-1.5 py-0">
                        {rec.confidence}% CONF
                      </Badge>
                      {rec.needsApproval && (
                        <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-400/30 bg-amber-400/10 uppercase tracking-wide px-1.5 py-0">
                          Review
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm text-white mb-1.5 leading-tight">{rec.title}</h3>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">{rec.description}</p>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" className="bg-primary text-white hover:bg-primary/90 text-xs h-8 w-full" onClick={() => handleAct(rec.id)}>
                        <Check className="w-3.5 h-3.5 mr-1.5" /> Approve Draft
                      </Button>
                      <Button size="sm" variant="outline" className="bg-transparent border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 text-xs h-8 w-full" onClick={() => dismissRecommendation(rec.id)}>
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-200/60 shadow-sm">
            <CardHeader className="bg-slate-50/50 py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Portal Sync
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Status</span>
                <Badge variant="outline" className={portalClass(wo.portalSyncStatus)}>{wo.portalSyncStatus}</Badge>
              </div>
              
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Draft Update Payload</div>
                <p className="text-slate-600 font-mono text-xs">
                  Status: {wo.status}<br/>
                  {tech ? `Tech: ${tech.name}` : "Pending assignment"}<br/>
                  Date: {shortDate(new Date().toISOString())}
                </p>
              </div>

              {canManage ? (
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                  <Button size="sm" className="w-full bg-slate-900 text-white hover:bg-slate-800" onClick={() => { updateWorkOrder(wo.id, { portalSyncStatus: "Sent" }); toast({ title: "Portal update sent", description: "You approved and sent this update to the customer portal." }); }} data-testid="button-approve-portal">
                    <Send className="w-3.5 h-3.5 mr-2" /> Approve & Sync
                  </Button>
                  <Button size="sm" variant="outline" className="w-full text-slate-600" data-testid="button-copy-manual">
                    <FileText className="w-3.5 h-3.5 mr-2" /> Copy for Manual Portal
                  </Button>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-100 text-xs font-medium text-amber-600 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> Portal updates require manager approval.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-sm font-medium text-slate-900 font-mono">{value}</div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <Card className="border-dashed border-2 border-slate-200 shadow-none bg-slate-50/50">
      <CardContent className="py-12 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-3 shadow-sm">
          <Icon className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">{description}</p>
      </CardContent>
    </Card>
  );
}