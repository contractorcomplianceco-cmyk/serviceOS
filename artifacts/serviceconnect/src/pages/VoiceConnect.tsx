import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mic, Sparkles, ShieldAlert, Languages, Wrench, Clock, FileText, CheckCircle2 } from "lucide-react";

export default function VoiceConnect() {
  const [, params] = useRoute("/tech/voiceconnect/:id");
  const [, navigate] = useLocation();
  const { workOrders, customers, closeouts, updateCloseout } = useAppStore();
  const { toast } = useToast();

  const wo = workOrders.find((w) => w.id === params?.id);
  const closeout = closeouts.find((co) => co.workOrderId === params?.id);
  const customer = customers.find((c) => c.id === wo?.customerId);

  const [billing, setBilling] = useState(closeout?.billingLines.join("\n") ?? "");
  const [portal, setPortal] = useState(closeout?.portalUpdateText ?? "");
  const [customerText, setCustomerText] = useState(closeout?.customerUpdateText ?? "");
  const [submitted, setSubmitted] = useState(false);

  if (!wo) return (
    <div className="min-h-[100dvh] p-4 flex flex-col" style={{ background: "var(--sc-bg)" }}>
      <Button variant="ghost" onClick={() => navigate("/tech")} className="text-sc-2 self-start hover:text-white hover:bg-white/[0.05]">
        <ArrowLeft className="w-4 h-4 mr-2" />Back
      </Button>
      <Card className="mt-4 sc-panel border-panel"><CardContent className="py-16 text-center text-sc-3">Job not found.</CardContent></Card>
    </div>
  );

  const alreadySubmitted = closeout?.status !== undefined && closeout.status !== "Sent Back";

  const submitForReview = () => {
    if (closeout) {
      updateCloseout(closeout.id, { billingLines: billing.split("\n").filter(Boolean), portalUpdateText: portal, customerUpdateText: customerText, status: "Pending Review" });
    }
    setSubmitted(true);
    toast({ title: "Draft submitted for review", description: "Your closeout draft was sent to a supervisor. Nothing is billed or sent until approved." });
  };

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--sc-bg)" }}>
      <header className="px-5 py-4 sticky top-0 z-20 shadow-md border-b border-panel text-sc" style={{ background: "var(--sc-bg-deep)" }}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-sc-2 hover:text-white hover:bg-white/[0.05] -ml-2 shrink-0" onClick={() => navigate("/tech")} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 blue-glow-soft" style={{ background: "var(--sc-btn)" }}>
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-base font-bold leading-tight tracking-tight">VoiceConnect</div>
              <div className="text-xs font-medium leading-tight mt-0.5 truncate max-w-[200px] sm:max-w-xs" style={{ color: "var(--sc-blue)" }}>{wo.number} · {customer?.name}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto w-full mt-2">
        <div className="flex items-start gap-3 rounded-xl p-4 shadow-sm" style={{ background: "rgba(255,157,24,0.1)", border: "1px solid rgba(255,157,24,0.2)" }}>
          <ShieldAlert className="w-5 h-5 shrink-0" style={{ color: "var(--sc-orange)" }} />
          <div className="text-sm font-medium leading-relaxed" style={{ color: "var(--sc-orange)" }}>
            Everything captured here is a <span className="font-bold">DRAFT</span>. A supervisor will review and approve before anything is billed or sent to the customer.
          </div>
        </div>

        {!closeout ? (
          <Card className="sc-panel border-panel shadow-sm overflow-hidden">
            <CardContent className="p-8 text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 relative" style={{ background: "rgba(67,166,255,0.1)" }}>
                <div className="absolute inset-0 rounded-full border-4 animate-ping" style={{ borderColor: "rgba(67,166,255,0.2)" }}></div>
                <Mic className="w-10 h-10 relative z-10" style={{ color: "var(--sc-blue)" }} />
              </div>
              <h2 className="text-xl font-bold text-sc mb-2">Record Closeout</h2>
              <p className="text-sm font-medium text-sc-2 mb-8 max-w-sm">
                Speak naturally about what you did. RoseOS will transcribe, translate, and draft your billing and portal updates.
              </p>
              <Button 
                size="lg" 
                className="w-full max-w-xs text-white shadow-lg text-base font-bold h-14 rounded-xl blue-glow-soft hover:opacity-90 transition-opacity" 
                style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }}
                onClick={() => toast({ title: "Demo mode", description: "This prototype ships with recorded example closeouts. Open a job with an existing closeout to see the full flow." })} 
                data-testid="button-record"
              >
                <Mic className="w-5 h-5 mr-2" /> Start Recording
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <Card className="sc-card border-panel shadow-sm">
              <CardHeader className="sc-inner border-b border-panel-subtle p-4 rounded-t-[calc(var(--radius)-2px)]">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-sc flex items-center gap-2 uppercase tracking-wider">
                    <Mic className="w-4 h-4 text-sc-3" /> Original Transcript
                  </CardTitle>
                  <Badge variant="outline" className="font-bold uppercase tracking-wider text-[10px] text-sc-2" style={{ background: "var(--sc-elevated)", borderColor: "var(--sc-line)" }}>
                    <Languages className="w-3 h-3 mr-1" /> {closeout.transcriptLanguage}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <p className="text-base text-sc italic leading-relaxed font-medium">"{closeout.transcript}"</p>
                {closeout.translatedSummary && (
                  <div className="pt-4 border-t border-panel-subtle sc-inner -mx-4 -mb-4 p-4 rounded-b-[calc(var(--radius)-2px)]">
                    <div className="text-[10px] font-bold uppercase text-sc-3 tracking-wider mb-2">English Translation</div>
                    <p className="text-sm font-medium text-sc leading-relaxed">{closeout.translatedSummary}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="sc-panel border-panel-strong shadow-xl overflow-hidden relative circuit-texture">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" style={{ background: "rgba(67,166,255,0.15)" }} />
              <CardHeader className="border-b border-panel-subtle pb-4 relative z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold text-sc flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-sc-blue" /> RoseOS Extraction
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider" style={{ background: "rgba(67,166,255,0.1)", color: "var(--sc-blue)", borderColor: "rgba(67,166,255,0.2)" }}>
                    High Confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-6 relative z-10">
                <div className="rounded-lg p-4 border border-panel-subtle sc-inner">
                  <p className="text-sm font-medium text-sc-2 leading-relaxed">{closeout.aiSummary}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-sc-3 tracking-wider mb-2">
                      <FileText className="w-3 h-3" /> Work Performed
                    </div>
                    <p className="text-sm font-medium text-sc">{closeout.workPerformed}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-sc-3 tracking-wider mb-2">
                        <Wrench className="w-3 h-3" /> Materials Detected
                      </div>
                      {closeout.materialsDetected.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {closeout.materialsDetected.map((m) => (
                            <Badge key={m} variant="secondary" className="font-medium text-sc-2" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}>
                              {m}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-sc-3">None detected</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-sc-3 tracking-wider mb-2">
                        <Clock className="w-3 h-3" /> Labor Suggested
                      </div>
                      <p className="text-sm font-medium text-sc">{closeout.laborSuggested}</p>
                    </div>
                  </div>
                </div>

                {closeout.missingInfo.length > 0 && (
                  <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: "rgba(255,157,24,0.1)", border: "1px solid rgba(255,157,24,0.2)" }}>
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--sc-orange)" }} />
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--sc-orange)" }}>Missing Information</div>
                      <div className="text-sm font-medium text-sc-2">{closeout.missingInfo.join(", ")}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="sc-card border-panel shadow-sm overflow-hidden">
              <CardHeader className="sc-inner border-b border-panel-subtle p-4 rounded-t-[calc(var(--radius)-2px)]">
                <CardTitle className="text-sm font-bold text-sc uppercase tracking-wider">
                  Review & Edit Drafts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-sc uppercase tracking-wider flex items-center justify-between">
                    Billing Lines
                    <Badge variant="outline" className="text-[9px] font-bold text-sc-3 border-panel uppercase">Editable</Badge>
                  </label>
                  <Textarea 
                    value={billing} 
                    onChange={(e) => setBilling(e.target.value)} 
                    rows={4} 
                    className="text-sm font-mono leading-relaxed focus-visible:ring-1 focus-visible:ring-[var(--sc-line-active)] shadow-none resize-none text-sc" 
                    style={{ background: "var(--sc-inner)", borderColor: "var(--sc-line)" }}
                    disabled={alreadySubmitted && !submitted} 
                    data-testid="textarea-billing" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-sc uppercase tracking-wider flex items-center justify-between">
                    Customer Update
                    <Badge variant="outline" className="text-[9px] font-bold text-sc-3 border-panel uppercase">Editable</Badge>
                  </label>
                  <Textarea 
                    value={customerText} 
                    onChange={(e) => setCustomerText(e.target.value)} 
                    rows={3} 
                    className="text-sm font-medium leading-relaxed focus-visible:ring-1 focus-visible:ring-[var(--sc-line-active)] shadow-none resize-none text-sc" 
                    style={{ background: "var(--sc-inner)", borderColor: "var(--sc-line)" }}
                    disabled={alreadySubmitted && !submitted} 
                    data-testid="textarea-customer" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-sc uppercase tracking-wider flex items-center justify-between">
                    Portal Update
                    <Badge variant="outline" className="text-[9px] font-bold text-sc-3 border-panel uppercase">Editable</Badge>
                  </label>
                  <Textarea 
                    value={portal} 
                    onChange={(e) => setPortal(e.target.value)} 
                    rows={3} 
                    className="text-sm font-medium leading-relaxed focus-visible:ring-1 focus-visible:ring-[var(--sc-line-active)] shadow-none resize-none text-sc" 
                    style={{ background: "var(--sc-inner)", borderColor: "var(--sc-line)" }}
                    disabled={alreadySubmitted && !submitted} 
                    data-testid="textarea-portal" 
                  />
                </div>
              </CardContent>
            </Card>

            <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-panel shadow-[0_-4px_15px_rgba(0,0,0,0.2)] z-30 sm:relative sm:border-0 sm:shadow-none sm:p-0" style={{ background: "var(--sc-bg)" }}>
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                <div className="hidden sm:block">
                  <Badge variant="outline" className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider`} style={{
                    color: closeout.status === "Approved" ? "var(--sc-green)" : closeout.status === "Sent Back" ? "var(--sc-orange)" : "var(--sc-blue)",
                    background: closeout.status === "Approved" ? "rgba(56,212,119,0.1)" : closeout.status === "Sent Back" ? "rgba(255,157,24,0.1)" : "rgba(67,166,255,0.1)",
                    borderColor: closeout.status === "Approved" ? "rgba(56,212,119,0.2)" : closeout.status === "Sent Back" ? "rgba(255,157,24,0.2)" : "rgba(67,166,255,0.2)"
                  }}>
                    Status: {submitted ? "Submitted for Review" : closeout.status}
                  </Badge>
                </div>
                <Button 
                  className={`w-full sm:w-auto h-14 sm:h-12 px-8 text-base sm:text-sm font-bold shadow-md rounded-xl transition-all text-white`}
                  style={
                    (submitted || closeout.status === "Approved")
                      ? { background: "var(--sc-green)", borderColor: "var(--sc-green)" }
                      : { background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)", boxShadow: "0 6px 24px -12px rgba(0, 139, 255, 0.4)" }
                  }
                  onClick={submitForReview} 
                  disabled={submitted || closeout.status === "Approved"} 
                  data-testid="button-submit-review"
                >
                  {(submitted || closeout.status === "Approved") ? (
                    <><CheckCircle2 className="w-5 h-5 mr-2" /> {submitted ? "Submitted" : "Approved"}</>
                  ) : (
                    "Submit Draft for Review"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
