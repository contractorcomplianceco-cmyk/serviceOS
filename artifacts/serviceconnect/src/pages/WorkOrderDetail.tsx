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
        <Button variant="ghost" onClick={() => navigate("/work-orders")} className="mb-4 text-sc-3 hover:text-sc"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        <Card className="sc-panel border-panel-subtle shadow-sm"><CardContent className="py-20 flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-12 h-12 text-sc-3 mb-4" />
          <h2 className="text-xl font-semibold text-sc">Work order not found</h2>
          <p className="text-sc-3 mt-2">The requested work order does not exist or has been removed.</p>
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
      <div className="flex items-center text-sm font-medium text-sc-3 mb-2">
        <button onClick={() => navigate("/work-orders")} className="hover:text-sc transition-colors flex items-center" data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Work Orders
        </button>
        <span className="mx-2 text-sc-3 opacity-50">/</span>
        <span className="text-sc">{wo.number}</span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">{wo.number}</h1>
            <Badge variant="outline" className={`${priorityClass(wo.priority)} px-2.5 py-0.5 text-xs`}>{wo.priority}</Badge>
            <Badge variant="outline" className={`${statusClass(wo.status)} px-2.5 py-0.5 text-xs`}>{wo.status}</Badge>
            {wo.materialsFlag && <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-sc-2 border-panel bg-[color:var(--sc-elevated)]">Materials</Badge>}
            {wo.quoteFlag && <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-[color:var(--sc-orange)] border-[color:rgba(255,157,24,0.3)] bg-[color:rgba(255,157,24,0.12)]">Quote Req</Badge>}
          </div>
          <p className="text-sc-3 text-sm font-medium">
            {wo.type} · {wo.region} · Source: <span className="text-sc-2">{wo.source}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          {canManage && (
            <Select value={wo.status} onValueChange={(v) => updateWorkOrder(wo.id, { status: v as typeof wo.status })}>
              <SelectTrigger className="w-full lg:w-[220px] text-sc font-medium" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }} data-testid="select-wo-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}>
                {["New", "Triage Needed", "Need Scheduled", "Scheduled", "First Trip", "On Site", "Awaiting Materials", "Awaiting Quote Approval", "Return Trip Needed", "Completed Pending Review", "Ready for Billing", "Invoiced", "Closed", "Cancelled"].map((s) => (
                  <SelectItem key={s} value={s} className="text-sc">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {wo.importantNotes && (
        <div className="flex items-start gap-3 rounded-xl px-5 py-4 text-sm shadow-sm" style={{ background: "rgba(255,51,72,0.1)", border: "1px solid rgba(255,51,72,0.25)", color: "var(--sc-red)" }}>
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
          <Card className="sc-panel shadow-sm overflow-hidden border-none rounded-xl">
            <CardHeader className="py-3 px-4 border-b border-panel-subtle" style={{ background: "var(--sc-inner)" }}>
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-sc-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Customer & Location
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-5">
              <div>
                <button onClick={() => navigate(`/customers/${customer?.id}`)} className="font-bold text-sc-blue hover:underline text-base" data-testid="link-customer">{customer?.name}</button>
                <div className="text-sm text-sc-3 mt-1 flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {customer?.phone}</div>
              </div>
              <div className="h-px w-full" style={{ background: "var(--sc-line-subtle)" }} />
              <div>
                <div className="font-semibold text-sc text-sm">{location?.name}</div>
                <div className="text-sm text-sc-3 mt-1 flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /> 
                  <span>{location?.address}<br/>{location?.city}, {location?.state} {location?.zip}</span>
                </div>
              </div>
              {wo.locationNotes && (
                <div className="rounded-md p-2.5 text-xs border" style={{ background: "rgba(255,157,24,0.1)", borderColor: "rgba(255,157,24,0.3)", color: "var(--sc-orange)" }}>
                  <span className="font-semibold uppercase tracking-wider text-[10px] block mb-1">Location Notes</span>
                  {wo.locationNotes}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="sc-panel shadow-sm overflow-hidden border-none rounded-xl">
            <CardHeader className="py-3 px-4 border-b border-panel-subtle" style={{ background: "var(--sc-inner)" }}>
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-sc-3 flex items-center gap-2">
                <Truck className="w-4 h-4" /> Schedule & Tech
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <div className="text-xs text-sc-3 font-medium uppercase tracking-wider mb-1">Assigned To</div>
                {tech ? (
                  <div className="font-semibold text-sc">{tech.name}</div>
                ) : (
                  <div className="font-medium flex items-center gap-1.5" style={{ color: "var(--sc-orange)" }}><AlertTriangle className="w-3.5 h-3.5" /> Unassigned</div>
                )}
              </div>
              <div>
                <div className="text-xs text-sc-3 font-medium uppercase tracking-wider mb-1">Due Date</div>
                <div className="font-medium text-sc flex items-center gap-2"><Calendar className="w-4 h-4 text-sc-3" /> {shortDate(wo.dueDate)}</div>
              </div>
              <div>
                <div className="text-xs text-sc-3 font-medium uppercase tracking-wider mb-1">Time Window</div>
                <div className="font-medium text-sc flex items-center gap-2"><Clock className="w-4 h-4 text-sc-3" /> {wo.timeWindow ?? "Flexible"}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="sc-panel shadow-sm overflow-hidden border-none rounded-xl">
            <CardHeader className="py-3 px-4 border-b border-panel-subtle" style={{ background: "var(--sc-inner)" }}>
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-sc-3 flex items-center gap-2">
                <Receipt className="w-4 h-4" /> Accounting References
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <InfoRow label="PO Number" value={wo.poNumber} />
              <InfoRow label="Reference #" value={wo.referenceNumber} />
              <InfoRow label="External ID" value={wo.externalId} />
              <div className="pt-2">
                <div className="text-xs text-sc-3 font-medium uppercase tracking-wider mb-1.5">Billing Status</div>
                <Badge variant="outline" className={billingClass(wo.billingStatus)}>{wo.billingStatus}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column: Main Content Tabs */}
        <div className="xl:col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start h-12 bg-transparent border-b border-panel-subtle rounded-none p-0 space-x-6 overflow-x-auto overflow-y-hidden" data-testid="tabs-wo">
              <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-sc-blue rounded-none px-2 py-3 font-semibold text-sc-3 data-[state=active]:text-sc-blue h-full">Overview</TabsTrigger>
              <TabsTrigger value="trips" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-sc-blue rounded-none px-2 py-3 font-semibold text-sc-3 data-[state=active]:text-sc-blue h-full">Trips <Badge variant="secondary" className="ml-2 text-[10px] text-sc-2 border-panel bg-[color:var(--sc-elevated)]">{wo.trips.length}</Badge></TabsTrigger>
              <TabsTrigger value="labor" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-sc-blue rounded-none px-2 py-3 font-semibold text-sc-3 data-[state=active]:text-sc-blue h-full">Labor & Materials</TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-sc-blue rounded-none px-2 py-3 font-semibold text-sc-3 data-[state=active]:text-sc-blue h-full">Activity History</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="overview" className="space-y-6 m-0 animate-in fade-in duration-300">
                <Card className="sc-panel shadow-sm border-none rounded-xl">
                  <CardHeader className="pb-3"><CardTitle className="text-lg text-sc">Job Description</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sc-2 whitespace-pre-wrap leading-relaxed">{wo.description}</p>
                    
                    {wo.quoteNotes && (
                      <div className="mt-6 rounded-lg p-4" style={{ background: "rgba(255,157,24,0.1)", border: "1px solid rgba(255,157,24,0.3)" }}>
                        <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider mb-2" style={{ color: "var(--sc-orange)" }}>
                          <DollarSign className="w-4 h-4" /> Quote Awaiting Approval
                        </div>
                        <p className="text-sm" style={{ color: "var(--sc-orange)" }}>{wo.quoteNotes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {!tech && canManage && (
                  <Card className="shadow-sm border-none rounded-xl" style={{ background: "rgba(67,166,255,0.1)", border: "1px solid rgba(67,166,255,0.3)" }}>
                    <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-sc text-base flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-sc-blue" /> Assign Technician
                        </div>
                        <div className="text-sm text-sc-2 mt-1">RoseOS suggests <span className="font-semibold text-sc-blue">{techs[0]?.name}</span> based on skills and drive time.</div>
                      </div>
                      <Select onValueChange={assign}>
                        <SelectTrigger className="w-full sm:w-[240px] text-sc" style={{ background: "var(--sc-elevated)", border: "1px solid rgba(67,166,255,0.4)" }} data-testid="select-assign-tech">
                          <SelectValue placeholder="Select technician..." />
                        </SelectTrigger>
                        <SelectContent style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}>
                          {techs.map((t) => <SelectItem key={t.id} value={t.id} className="text-sc">{t.name} · {t.zone}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                )}

                {wo.attachments.length > 0 && (
                  <Card className="sc-panel shadow-sm border-none rounded-xl">
                    <CardHeader className="pb-3"><CardTitle className="text-lg text-sc">Attachments</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {wo.attachments.map(a => (
                          <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-panel-subtle hover:bg-white/[0.04] transition-colors cursor-pointer group">
                            <div className="w-10 h-10 rounded flex items-center justify-center shrink-0" style={{ background: "rgba(67,166,255,0.15)", color: "var(--sc-blue)" }}>
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-sc truncate group-hover:text-sc-blue transition-colors">{a.name}</p>
                              <p className="text-xs text-sc-3">{shortDate(a.date)} · {a.uploadedBy}</p>
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
                      <Card key={t.id} className="sc-panel shadow-sm border-none rounded-xl" data-testid={`trip-${t.id}`}>
                        <CardHeader className="py-3 px-5 border-b border-panel-subtle flex flex-row items-center justify-between" style={{ background: "var(--sc-inner)" }}>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-sc-2 font-bold uppercase tracking-wider text-[10px]" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}>Trip {t.tripNumber}</Badge>
                            <span className="font-semibold text-sc text-sm">{tt?.name}</span>
                          </div>
                          <span className="text-sm font-medium text-sc-3">{shortDate(t.date)}</span>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                          <div className="flex flex-wrap gap-6">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(56,212,119,0.15)", color: "var(--sc-green)" }}><Check className="w-4 h-4" /></div>
                              <div>
                                <div className="text-[10px] uppercase font-bold tracking-wider text-sc-3">Check In</div>
                                <div className="font-medium text-sc text-sm">{t.checkIn || "—"}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--sc-elevated)", color: "var(--sc-text-3)" }}><Clock className="w-4 h-4" /></div>
                              <div>
                                <div className="text-[10px] uppercase font-bold tracking-wider text-sc-3">Check Out</div>
                                <div className="font-medium text-sc text-sm">{t.checkOut || "—"}</div>
                              </div>
                            </div>
                          </div>
                          
                          {t.workPerformed && (
                            <div className="pt-2">
                              <div className="text-[10px] uppercase font-bold tracking-wider text-sc-3 mb-1.5">Work Performed</div>
                              <p className="text-sm text-sc-2 rounded-md p-3 border border-panel-subtle leading-relaxed" style={{ background: "var(--sc-inner)" }}>{t.workPerformed}</p>
                            </div>
                          )}
                          
                          {t.returnTripReason && (
                            <div className="mt-2 rounded-md p-3 border" style={{ background: "rgba(255,157,24,0.1)", borderColor: "rgba(255,157,24,0.3)" }}>
                              <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider mb-1" style={{ color: "var(--sc-orange)" }}>
                                <AlertTriangle className="w-3.5 h-3.5" /> Return Trip Required
                              </div>
                              <p className="text-sm text-sc-2">{t.returnTripReason}</p>
                              {t.materialsNeeded && <p className="text-xs mt-1 font-medium text-sc-3">Needs: {t.materialsNeeded}</p>}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                }
              </TabsContent>

              <TabsContent value="labor" className="space-y-6 m-0 animate-in fade-in duration-300">
                <Card className="sc-panel shadow-sm overflow-hidden border-none rounded-xl">
                  <CardHeader className="border-b border-panel-subtle py-4" style={{ background: "var(--sc-inner)" }}><CardTitle className="text-base text-sc flex items-center gap-2"><Clock className="w-4 h-4 text-sc-3" /> Labor Entries</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    {wo.labor.length === 0 ? <div className="p-6 text-center text-sm text-sc-3">No labor logged.</div> : (
                      <div className="divide-y divide-[color:var(--sc-line-subtle)]">
                        {wo.labor.map((l) => {
                          const lt = users.find((u) => u.id === l.technicianId);
                          return (
                            <div key={l.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 hover:bg-white/[0.04] transition-colors">
                              <div>
                                <div className="font-semibold text-sc text-sm">{lt?.name}</div>
                                <div className="text-xs text-sc-3 mt-0.5">{shortDate(l.date)} · {l.type} rate</div>
                              </div>
                              <div className="flex items-center gap-4 sm:justify-end">
                                <div className="text-right">
                                  <div className="font-bold text-sc text-sm">{money(l.hours * l.rate)}</div>
                                  <div className="text-xs text-sc-3">{l.hours} hrs @ ${l.rate}/hr</div>
                                </div>
                                {l.approved ? <Badge variant="outline" className="text-[10px] uppercase" style={{ background: "rgba(56,212,119,0.1)", color: "var(--sc-green)", borderColor: "rgba(56,212,119,0.3)" }}>Approved</Badge> : <Badge variant="outline" className="text-[10px] uppercase" style={{ background: "rgba(255,157,24,0.1)", color: "var(--sc-orange)", borderColor: "rgba(255,157,24,0.3)" }}>Pending</Badge>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="sc-panel shadow-sm overflow-hidden border-none rounded-xl">
                  <CardHeader className="border-b border-panel-subtle py-4" style={{ background: "var(--sc-inner)" }}><CardTitle className="text-base text-sc flex items-center gap-2"><Wrench className="w-4 h-4 text-sc-3" /> Materials Used</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    {wo.materials.length === 0 ? <div className="p-6 text-center text-sm text-sc-3">No materials logged.</div> : (
                      <div className="divide-y divide-[color:var(--sc-line-subtle)]">
                        {wo.materials.map((m) => (
                          <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 hover:bg-white/[0.04] transition-colors">
                            <div>
                              <div className="font-semibold text-sc text-sm">{m.name}</div>
                              <div className="text-xs text-sc-3 mt-0.5">Qty: {m.quantity}</div>
                            </div>
                            <div className="flex items-center gap-4 sm:justify-end">
                              <div className="text-right">
                                <div className="font-bold text-sc text-sm">{money(m.quantity * m.billablePrice)}</div>
                                <div className="text-xs text-sc-3">${m.billablePrice} ea</div>
                              </div>
                              {m.approved ? <Badge variant="outline" className="text-[10px] uppercase" style={{ background: "rgba(56,212,119,0.1)", color: "var(--sc-green)", borderColor: "rgba(56,212,119,0.3)" }}>Approved</Badge> : <Badge variant="outline" className="text-[10px] uppercase" style={{ background: "rgba(255,157,24,0.1)", color: "var(--sc-orange)", borderColor: "rgba(255,157,24,0.3)" }}>Pending</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                  <div className="border-t border-panel-subtle p-4 flex items-center justify-between" style={{ background: "var(--sc-inner)" }}>
                    <span className="font-semibold text-sc-2 uppercase tracking-wider text-xs">Estimated Job Total</span>
                    <span className="font-bold text-sc-blue text-lg">{money(laborTotal + materialTotal)}</span>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="m-0 animate-in fade-in duration-300">
                <Card className="sc-panel shadow-sm border-none rounded-xl">
                  <CardHeader className="border-b border-panel-subtle py-4"><CardTitle className="text-base text-sc flex items-center gap-2"><Activity className="w-4 h-4 text-sc-3" /> Audit Log</CardTitle></CardHeader>
                  <CardContent className="p-6">
                    <div className="text-center text-sm text-sc-3 py-10">
                      Audit log is not available for this job yet.
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
        
        {/* Right Column: AI & Side Actions */}
        <div className="xl:col-span-1 space-y-6">
          {woRecommendations.length > 0 && (
            <Card className="sc-panel circuit-texture overflow-hidden border-none rounded-xl">
              <div className="px-4 py-3 border-b border-panel-subtle relative" style={{ background: "var(--sc-inner)" }}>
                <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(67,166,255,0.15), transparent 70%)" }} />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-sc flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-sc-blue" /> RoseOS Analysis
                </h3>
              </div>
              <CardContent className="p-4 space-y-4">
                {woRecommendations.map((rec) => (
                  <div key={rec.id} className="rounded-lg p-3" style={{ background: "var(--sc-panel-2)", border: "1px solid var(--sc-line)" }}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[9px] font-mono font-semibold tracking-wide text-sc-blue">
                        {rec.confidence}% CONFIDENCE
                      </span>
                      {rec.needsApproval && (
                        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ color: "var(--sc-orange)", background: "rgba(255,157,24,0.1)", border: "1px solid rgba(255,157,24,0.2)" }}>
                          Approval
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-sc leading-snug">{rec.title}</h4>
                    <p className="text-xs text-sc-3 mt-1 leading-relaxed">{rec.description}</p>
                    <div className="mt-3">
                      <Button 
                        size="sm" 
                        className="w-full text-xs h-8 text-white blue-glow-soft" 
                        style={{background:'var(--sc-btn)',border:'1px solid var(--sc-btn-highlight)'}}
                        onClick={() => handleAct(rec.id)}
                        data-testid={`button-approve-wo-rec-${rec.id}`}
                      >
                        <Check className="w-3.5 h-3.5 mr-1.5" /> Approve Draft
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-sc-3 mb-2 px-1">Quick Actions</h3>
            <Button variant="outline" className="w-full justify-start h-10 text-sc-2 hover:text-white" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}}>
              <FileCheck className="w-4 h-4 mr-2 text-sc-3" /> Approve All Labor/Mats
            </Button>
            <Button variant="outline" className="w-full justify-start h-10 text-sc-2 hover:text-white" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}}>
              <Send className="w-4 h-4 mr-2 text-sc-3" /> Send Portal Update
            </Button>
            <Button variant="outline" className="w-full justify-start h-10 text-sc-2 hover:text-white" style={{background:'var(--sc-elevated)',border:'1px solid var(--sc-line)'}}>
              <Edit2 className="w-4 h-4 mr-2 text-sc-3" /> Edit Work Order
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <div className="text-xs text-sc-3 font-medium uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-sm font-medium text-sc">{value || "—"}</div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <Card className="sc-panel border-panel-subtle border-dashed shadow-sm">
      <CardContent className="py-12 flex flex-col items-center justify-center text-center">
        <Icon className="w-10 h-10 text-sc-3 mb-3" />
        <h3 className="text-base font-semibold text-sc">{title}</h3>
        <p className="text-sm text-sc-3 mt-1 max-w-sm">{description}</p>
      </CardContent>
    </Card>
  );
}