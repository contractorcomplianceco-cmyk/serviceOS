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
    <div className="min-h-[100dvh] bg-slate-100 p-4">
      <Button variant="ghost" onClick={() => navigate("/tech")}>
        <ArrowLeft className="w-4 h-4 mr-2" />Back
      </Button>
      <Card className="mt-4"><CardContent className="py-16 text-center text-muted-foreground">Job not found.</CardContent></Card>
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
    <div className="min-h-[100dvh] bg-slate-100 pb-24">
      <header className="bg-slate-900 text-white px-5 py-4 sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800 -ml-2 shrink-0" onClick={() => navigate("/tech")} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)] shrink-0">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-base font-bold leading-tight tracking-tight">VoiceConnect</div>
              <div className="text-xs text-blue-300 font-medium leading-tight mt-0.5 truncate max-w-[200px] sm:max-w-xs">{wo.number} · {customer?.name}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto w-full mt-2">
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-sm text-amber-900 font-medium leading-relaxed">
            Everything captured here is a <span className="font-bold">DRAFT</span>. A supervisor will review and approve before anything is billed or sent to the customer.
          </div>
        </div>

        {!closeout ? (
          <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-8 text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping"></div>
                <Mic className="w-10 h-10 text-primary relative z-10" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Record Closeout</h2>
              <p className="text-sm font-medium text-slate-500 mb-8 max-w-sm">
                Speak naturally about what you did. RoseOS will transcribe, translate, and draft your billing and portal updates.
              </p>
              <Button 
                size="lg" 
                className="w-full max-w-xs bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary/90 text-base font-bold h-14 rounded-xl" 
                onClick={() => toast({ title: "Demo mode", description: "This prototype ships with recorded example closeouts. Open a job with an existing closeout to see the full flow." })} 
                data-testid="button-record"
              >
                <Mic className="w-5 h-5 mr-2" /> Start Recording
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <Card className="border border-slate-200 shadow-sm bg-white">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
                    <Mic className="w-4 h-4 text-slate-400" /> Original Transcript
                  </CardTitle>
                  <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                    <Languages className="w-3 h-3 mr-1" /> {closeout.transcriptLanguage}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <p className="text-base text-slate-800 italic leading-relaxed font-medium">"{closeout.transcript}"</p>
                {closeout.translatedSummary && (
                  <div className="pt-4 border-t border-slate-100 bg-slate-50/50 -mx-4 -mb-4 p-4">
                    <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">English Translation</div>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">{closeout.translatedSummary}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-slate-900 bg-slate-900 text-slate-100 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <CardHeader className="border-b border-slate-800 pb-4 relative z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" /> RoseOS Extraction
                  </CardTitle>
                  <Badge variant="outline" className="bg-primary/20 text-primary-foreground border-primary/30 text-[10px] uppercase font-bold tracking-wider">
                    High Confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-6 relative z-10">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <p className="text-sm font-medium text-slate-300 leading-relaxed">{closeout.aiSummary}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">
                      <FileText className="w-3 h-3" /> Work Performed
                    </div>
                    <p className="text-sm font-medium text-slate-200">{closeout.workPerformed}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">
                        <Wrench className="w-3 h-3" /> Materials Detected
                      </div>
                      {closeout.materialsDetected.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {closeout.materialsDetected.map((m) => (
                            <Badge key={m} variant="secondary" className="bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                              {m}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">None detected</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">
                        <Clock className="w-3 h-3" /> Labor Suggested
                      </div>
                      <p className="text-sm font-medium text-slate-200">{closeout.laborSuggested}</p>
                    </div>
                  </div>
                </div>

                {closeout.missingInfo.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-0.5">Missing Information</div>
                      <div className="text-sm font-medium text-amber-200/90">{closeout.missingInfo.join(", ")}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
                <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Review & Edit Drafts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    Billing Lines
                    <Badge variant="outline" className="text-[9px] font-bold text-slate-400 border-slate-200 uppercase">Editable</Badge>
                  </label>
                  <Textarea 
                    value={billing} 
                    onChange={(e) => setBilling(e.target.value)} 
                    rows={4} 
                    className="text-sm font-mono leading-relaxed bg-slate-50 border-slate-200 focus-visible:ring-primary shadow-none resize-none" 
                    disabled={alreadySubmitted && !submitted} 
                    data-testid="textarea-billing" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    Customer Update
                    <Badge variant="outline" className="text-[9px] font-bold text-slate-400 border-slate-200 uppercase">Editable</Badge>
                  </label>
                  <Textarea 
                    value={customerText} 
                    onChange={(e) => setCustomerText(e.target.value)} 
                    rows={3} 
                    className="text-sm font-medium leading-relaxed bg-slate-50 border-slate-200 focus-visible:ring-primary shadow-none resize-none" 
                    disabled={alreadySubmitted && !submitted} 
                    data-testid="textarea-customer" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    Portal Update
                    <Badge variant="outline" className="text-[9px] font-bold text-slate-400 border-slate-200 uppercase">Editable</Badge>
                  </label>
                  <Textarea 
                    value={portal} 
                    onChange={(e) => setPortal(e.target.value)} 
                    rows={3} 
                    className="text-sm font-medium leading-relaxed bg-slate-50 border-slate-200 focus-visible:ring-primary shadow-none resize-none" 
                    disabled={alreadySubmitted && !submitted} 
                    data-testid="textarea-portal" 
                  />
                </div>
              </CardContent>
            </Card>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-30 sm:relative sm:bg-transparent sm:border-0 sm:shadow-none sm:p-0">
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                <div className="hidden sm:block">
                  <Badge variant="outline" className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${closeout.status === "Approved" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : closeout.status === "Sent Back" ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-blue-500/10 text-blue-600 border-blue-500/20"}`}>
                    Status: {submitted ? "Submitted for Review" : closeout.status}
                  </Badge>
                </div>
                <Button 
                  className={`w-full sm:w-auto h-14 sm:h-12 px-8 text-base sm:text-sm font-bold shadow-md rounded-xl transition-all ${submitted || closeout.status === "Approved" ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-primary text-white hover:bg-primary/90"}`}
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