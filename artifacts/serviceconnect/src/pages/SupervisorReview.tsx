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
        <h1 className="text-3xl font-bold tracking-tight text-sc flex items-center gap-3" data-testid="text-page-title">
          <ClipboardCheck className="w-8 h-8 text-sc-blue" /> Supervisor Review
        </h1>
        <p className="text-sc-2 mt-2 text-sm max-w-3xl">
          Approve technician VoiceConnect closeouts before anything reaches billing or the customer. AI drafts are held here for your authorization.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl p-5 text-sm text-sc-3 shadow-lg relative overflow-hidden" style={{ background: "var(--sc-inner)", border: "1px solid var(--sc-line)" }}>
        <div className="absolute top-0 left-0 w-64 h-64 bg-[rgba(67,166,255,0.1)] rounded-full blur-3xl pointer-events-none -ml-20 -mt-20"></div>
        <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0 text-sc-blue relative z-10" />
        <div className="relative z-10 leading-relaxed"><span className="font-semibold text-sc">Human-in-the-loop:</span> RoseOS drafts the summary, captures materials, and prepares billing lines. Approval here is the absolute gate — nothing bills, syncs, or emails automatically.</div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-panel pb-2">
           <h2 className="text-sm font-bold text-sc uppercase tracking-wider">Pending Approval ({pending.length})</h2>
        </div>
        
        <div className="space-y-6">
          {pending.length === 0 ? (
            <Card className="sc-panel border border-dashed border-panel-strong shadow-none">
               <CardContent className="py-16 text-center">
                 <div className="w-16 h-16 rounded-full bg-[rgba(67,166,255,0.05)] flex items-center justify-center mx-auto mb-4 border border-panel">
                   <ClipboardCheck className="w-8 h-8 text-sc-3" />
                 </div>
                 <h3 className="text-sc font-medium">Review queue clear</h3>
                 <p className="text-sm text-sc-3 mt-1">No technician closeouts awaiting supervisor review.</p>
               </CardContent>
            </Card>
          ) : pending.map((co) => {
            const wo = workOrders.find((w) => w.id === co.workOrderId);
            const c = customers.find((cc) => cc.id === wo?.customerId);
            const tech = users.find((u) => u.id === co.technicianId);
            const open = expanded === co.id;
            
            return (
              <Card key={co.id} className="sc-panel border border-[color:var(--sc-line)] overflow-hidden transition-all duration-300 hover:border-panel-strong" data-testid={`closeout-${co.id}`}>
                <div className="h-1.5 w-full bg-gradient-to-r from-[color:var(--sc-blue)] to-[color:var(--sc-btn-highlight)]"></div>
                <CardHeader className="pb-4 cursor-pointer hover:bg-white/[0.04] transition-colors px-6" onClick={() => setExpanded(open ? null : co.id)}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-[rgba(67,166,255,0.1)] text-sc-blue border-[color:var(--sc-line-strong)] font-mono text-[10px]">{wo?.number}</Badge>
                        {co.transcriptLanguage !== 'English' && (
                           <Badge variant="outline" className="bg-transparent text-sc-3 border-panel-strong text-[10px]"><Languages className="w-3 h-3 mr-1" />{co.transcriptLanguage}</Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg text-sc">{c?.name}</CardTitle>
                      <div className="text-sm text-sc-3 mt-1.5 flex items-center gap-2">
                        <span className="font-medium text-sc-2">{tech?.name}</span>
                        <span>•</span>
                        <span>Submitted {relativeDay(co.submittedAt)}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="shrink-0 text-sc-3 hover:text-sc-2 hover:bg-white/[0.05]">
                      {open ? "Hide Details" : "View Details"}
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="px-6 pb-6 space-y-6">
                  {/* AI Summary Block - Always Visible */}
                  <div className="rounded-lg p-4 text-sc-2 text-sm leading-relaxed relative overflow-hidden shadow-inner" style={{ background: "var(--sc-inner)", border: "1px solid var(--sc-line)" }}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[rgba(67,166,255,0.1)] rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                    <div className="flex gap-3 relative z-10">
                      <Sparkles className="w-5 h-5 mt-0.5 shrink-0 text-sc-blue" />
                      <div>
                        <div className="font-semibold text-sc mb-1">RoseOS Synthesis</div>
                        <p>{co.aiSummary}</p>
                      </div>
                    </div>
                  </div>

                  {open && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300 pt-2 border-t border-panel">
                      {/* Transcript */}
                      <div>
                         <div className="text-xs font-bold text-sc-3 uppercase tracking-wider mb-2 flex items-center gap-2">
                           <Mic className="w-3.5 h-3.5" /> Raw VoiceConnect Transcript
                         </div>
                         <div className="text-sm rounded-lg p-4 text-sc-2 italic border border-panel" style={{ background: "var(--sc-elevated)" }}>
                           "{co.transcript}"
                         </div>
                         {co.translatedSummary && (
                           <div className="mt-2 text-sm bg-[rgba(67,166,255,0.05)] rounded-lg p-3 text-sc-2 border border-[color:var(--sc-line-strong)]">
                             <span className="font-semibold text-sc-blue">English Translation: </span>{co.translatedSummary}
                           </div>
                         )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Billing Lines */}
                        <div>
                          <div className="text-xs font-bold text-sc-3 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[color:var(--sc-green)]"></span> Billing Lines (Draft)
                          </div>
                          <ul className="text-sm space-y-2 rounded-lg p-4 border border-panel" style={{ background: "var(--sc-elevated)" }}>
                             {co.billingLines.map((b, i) => (
                               <li key={i} className="flex gap-2 text-sc-2"><Check className="w-4 h-4 text-[color:var(--sc-green)] shrink-0" /> {b}</li>
                             ))}
                          </ul>
                        </div>

                        <div className="space-y-6">
                           {/* Customer Update */}
                           <div>
                             <div className="text-xs font-bold text-sc-3 uppercase tracking-wider mb-2 flex items-center gap-2">
                               <MessageSquare className="w-3.5 h-3.5" /> Customer Email Update (Draft)
                             </div>
                             <div className="text-sm rounded-lg p-3 text-sc-2 border border-panel leading-relaxed" style={{ background: "var(--sc-elevated)" }}>
                               {co.customerUpdateText}
                             </div>
                           </div>
                           
                           {/* Portal Update */}
                           <div>
                             <div className="text-xs font-bold text-sc-3 uppercase tracking-wider mb-2">Portal Notes (Draft)</div>
                             <div className="text-sm rounded-lg p-3 text-sc-2 border border-panel font-mono text-xs" style={{ background: "var(--sc-elevated)" }}>
                               {co.portalUpdateText}
                             </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-panel">
                    <Button className="w-full sm:w-auto text-white blue-glow-soft" style={{background:'var(--sc-btn)',border:'1px solid var(--sc-btn-highlight)'}} onClick={() => approve(co.id, co.workOrderId)} data-testid={`button-approve-${co.id}`}>
                      <Check className="w-4 h-4 mr-2" /> Approve to Billing
                    </Button>
                    <Button className="w-full sm:w-auto border-destructive text-destructive hover:bg-[rgba(255,51,72,0.1)] bg-transparent" variant="outline" onClick={() => sendBack(co.id)} data-testid={`button-sendback-${co.id}`}>
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
          <div className="flex items-center justify-between border-b border-panel pb-2 mb-4">
             <h2 className="text-sm font-bold text-sc-3 uppercase tracking-wider">Recently Handled</h2>
          </div>
          <div className="space-y-3 opacity-80">
            {handled.slice(0, 5).map((co) => {
              const wo = workOrders.find((w) => w.id === co.workOrderId);
              const c = customers.find((cc) => cc.id === wo?.customerId);
              return (
                <div key={co.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-panel rounded-lg hover:bg-white/[0.04] transition-colors" style={{ background: "var(--sc-panel)" }}>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={co.status === "Approved" ? "bg-[rgba(56,212,119,0.1)] text-[color:var(--sc-green)] border-[color:var(--sc-green)]" : "bg-[rgba(255,157,24,0.1)] text-[color:var(--sc-orange)] border-[color:var(--sc-orange)]"}>{co.status}</Badge>
                    <div>
                       <span className="font-semibold text-sc text-sm">{wo?.number}</span> 
                       <span className="text-sc-3 text-sm ml-2">{c?.name}</span>
                    </div>
                  </div>
                  {co.status === "Approved" && wo && (
                     <Button size="sm" variant="ghost" className="text-sc-blue hover:bg-white/[0.05]" onClick={() => navigate(`/work-orders/${wo.id}`)} data-testid={`button-view-${co.id}`}>
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
