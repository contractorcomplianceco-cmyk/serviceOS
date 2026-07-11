import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { relativeDay } from "@/lib/ui";
import { Sparkles, ShieldCheck, Check, RotateCcw, Languages, Mic, ArrowRight, ClipboardCheck, MessageSquare } from "lucide-react";

export default function SupervisorReview() {
  const { closeouts, workOrders, customers, users, updateCloseout, updateWorkOrder } = useAppStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<string | null>(null);

  const pending = closeouts.filter((co) => co.status === "Pending Review");
  const handled = closeouts.filter((co) => co.status !== "Pending Review");

  const approve = (id: string, woId: string) => {
    updateCloseout(id, { status: "Approved" });
    updateWorkOrder(woId, { status: "Ready for Billing", billingStatus: "Ready for Invoice" });
    toast({ title: "Closeout approved", description: "Job moved to the billing queue. Review there before invoicing." });
  };
  
  const sendBack = (id: string) => {
    updateCloseout(id, { status: "Sent Back" });
    toast({ title: "Sent back to technician", description: "The technician will be asked to revise this closeout draft." });
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3" data-testid="text-page-title">
          <ClipboardCheck className="w-8 h-8 text-primary" /> Supervisor Review
        </h1>
        <p className="text-slate-500 mt-2 text-sm max-w-3xl">
          Approve technician VoiceConnect closeouts before anything reaches billing or the customer. AI drafts are held here for your authorization.
        </p>
      </div>

      <div className="flex items-start gap-3 bg-slate-900 border border-slate-800 rounded-xl p-5 text-sm text-slate-300 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none -ml-20 -mt-20"></div>
        <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0 text-primary relative z-10" />
        <div className="relative z-10 leading-relaxed"><span className="font-semibold text-white">Human-in-the-loop:</span> RoseOS drafts the summary, captures materials, and prepares billing lines. Approval here is the absolute gate — nothing bills, syncs, or emails automatically.</div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
           <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Pending Approval ({pending.length})</h2>
        </div>
        
        <div className="space-y-6">
          {pending.length === 0 ? (
            <Card className="border border-slate-200/60 border-dashed bg-slate-50">
               <CardContent className="py-16 text-center">
                 <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                   <ClipboardCheck className="w-8 h-8 text-slate-400" />
                 </div>
                 <h3 className="text-slate-900 font-medium">Review queue clear</h3>
                 <p className="text-sm text-slate-500 mt-1">No technician closeouts awaiting supervisor review.</p>
               </CardContent>
            </Card>
          ) : pending.map((co) => {
            const wo = workOrders.find((w) => w.id === co.workOrderId);
            const c = customers.find((cc) => cc.id === wo?.customerId);
            const tech = users.find((u) => u.id === co.technicianId);
            const open = expanded === co.id;
            
            return (
              <Card key={co.id} className="border border-primary/20 shadow-md bg-white overflow-hidden transition-all duration-300 hover:shadow-lg" data-testid={`closeout-${co.id}`}>
                <div className="h-1.5 w-full bg-gradient-to-r from-primary to-blue-400"></div>
                <CardHeader className="pb-4 cursor-pointer hover:bg-slate-50 transition-colors px-6" onClick={() => setExpanded(open ? null : co.id)}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-mono text-[10px]">{wo?.number}</Badge>
                        {co.transcriptLanguage !== 'English' && (
                           <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]"><Languages className="w-3 h-3 mr-1" />{co.transcriptLanguage}</Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg text-slate-900">{c?.name}</CardTitle>
                      <div className="text-sm text-slate-500 mt-1.5 flex items-center gap-2">
                        <span className="font-medium text-slate-700">{tech?.name}</span>
                        <span>•</span>
                        <span>Submitted {relativeDay(co.submittedAt)}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="shrink-0 text-slate-500">
                      {open ? "Hide Details" : "View Details"}
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="px-6 pb-6 space-y-6">
                  {/* AI Summary Block - Always Visible */}
                  <div className="bg-slate-900 rounded-lg p-4 text-slate-300 text-sm leading-relaxed relative overflow-hidden shadow-inner">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                    <div className="flex gap-3 relative z-10">
                      <Sparkles className="w-5 h-5 mt-0.5 shrink-0 text-primary" />
                      <div>
                        <div className="font-semibold text-white mb-1">RoseOS Synthesis</div>
                        <p>{co.aiSummary}</p>
                      </div>
                    </div>
                  </div>

                  {open && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300 pt-2 border-t">
                      {/* Transcript */}
                      <div>
                         <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                           <Mic className="w-3.5 h-3.5" /> Raw VoiceConnect Transcript
                         </div>
                         <div className="text-sm bg-slate-50 rounded-lg p-4 text-slate-700 italic border border-slate-100">
                           "{co.transcript}"
                         </div>
                         {co.translatedSummary && (
                           <div className="mt-2 text-sm bg-blue-50/50 rounded-lg p-3 text-slate-700 border border-blue-100">
                             <span className="font-semibold text-blue-800">English Translation: </span>{co.translatedSummary}
                           </div>
                         )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Billing Lines */}
                        <div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Billing Lines (Draft)
                          </div>
                          <ul className="text-sm space-y-2 bg-slate-50 rounded-lg p-4 border border-slate-100">
                             {co.billingLines.map((b, i) => (
                               <li key={i} className="flex gap-2 text-slate-700"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> {b}</li>
                             ))}
                          </ul>
                        </div>

                        <div className="space-y-6">
                           {/* Customer Update */}
                           <div>
                             <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                               <MessageSquare className="w-3.5 h-3.5" /> Customer Email Update (Draft)
                             </div>
                             <div className="text-sm bg-slate-50 rounded-lg p-3 text-slate-700 border border-slate-100 leading-relaxed">
                               {co.customerUpdateText}
                             </div>
                           </div>
                           
                           {/* Portal Update */}
                           <div>
                             <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Portal Notes (Draft)</div>
                             <div className="text-sm bg-slate-50 rounded-lg p-3 text-slate-700 border border-slate-100 font-mono text-xs">
                               {co.portalUpdateText}
                             </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t">
                    <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20" onClick={() => approve(co.id, co.workOrderId)} data-testid={`button-approve-${co.id}`}>
                      <Check className="w-4 h-4 mr-2" /> Approve to Billing
                    </Button>
                    <Button className="w-full sm:w-auto border-destructive text-destructive hover:bg-destructive/5" variant="outline" onClick={() => sendBack(co.id)} data-testid={`button-sendback-${co.id}`}>
                      <RotateCcw className="w-4 h-4 mr-2" /> Send Back to Tech
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {handled.length > 0 && (
        <div className="pt-8">
          <div className="flex items-center justify-between border-b pb-2 mb-4">
             <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Recently Handled</h2>
          </div>
          <div className="space-y-3 opacity-80">
            {handled.slice(0, 5).map((co) => {
              const wo = workOrders.find((w) => w.id === co.workOrderId);
              const c = customers.find((cc) => cc.id === wo?.customerId);
              return (
                <div key={co.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg bg-white hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={co.status === "Approved" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"}>{co.status}</Badge>
                    <div>
                       <span className="font-semibold text-slate-900 text-sm">{wo?.number}</span> 
                       <span className="text-slate-500 text-sm ml-2">{c?.name}</span>
                    </div>
                  </div>
                  {co.status === "Approved" && wo && (
                     <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/5" onClick={() => navigate(`/work-orders/${wo.id}`)} data-testid={`button-view-${co.id}`}>
                       View Job <ArrowRight className="w-3.5 h-3.5 ml-1" />
                     </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
