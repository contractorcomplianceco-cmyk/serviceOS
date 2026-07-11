import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mic, Sparkles, ShieldCheck, Languages, Wrench } from "lucide-react";

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

  if (!wo) return <div className="min-h-screen bg-slate-50 p-4"><Button variant="ghost" onClick={() => navigate("/tech")}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button><Card><CardContent className="py-16 text-center text-muted-foreground">Job not found.</CardContent></Card></div>;

  const alreadySubmitted = closeout?.status !== undefined && closeout.status !== "Sent Back";

  const submitForReview = () => {
    if (closeout) {
      updateCloseout(closeout.id, { billingLines: billing.split("\n").filter(Boolean), portalUpdateText: portal, customerUpdateText: customerText, status: "Pending Review" });
    }
    setSubmitted(true);
    toast({ title: "Draft submitted for review", description: "Your closeout draft was sent to a supervisor. Nothing is billed or sent until approved." });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white px-4 py-3 sticky top-0 z-10 flex items-center gap-2">
        <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800 -ml-2" onClick={() => navigate("/tech")} data-testid="button-back"><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center"><Mic className="w-4 h-4 text-white" /></div>
          <div>
            <div className="text-sm font-semibold leading-tight">VoiceConnect</div>
            <div className="text-[11px] text-slate-400 leading-tight">{wo.number} · {customer?.name}</div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5 text-xs text-slate-700">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
          <div>Everything captured here is a <span className="font-semibold">draft</span>. A supervisor reviews before anything is billed or sent to the customer.</div>
        </div>

        {!closeout ? (
          <Card>
            <CardContent className="py-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto"><Mic className="w-8 h-8 text-primary" /></div>
              <div>
                <div className="font-semibold text-slate-900">Record your closeout</div>
                <p className="text-sm text-muted-foreground mt-1">Speak naturally about what you did. RoseOS transcribes, translates, and drafts billing + portal updates.</p>
              </div>
              <Button className="bg-primary text-white" onClick={() => toast({ title: "Demo mode", description: "This prototype ships with recorded example closeouts. Open a job with an existing closeout to see the full flow." })} data-testid="button-record"><Mic className="w-4 h-4 mr-2" /> Start Recording</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Mic className="w-4 h-4 text-muted-foreground" /> Transcript <Badge variant="outline" className="text-[10px] ml-auto"><Languages className="w-3 h-3 mr-1" />{closeout.transcriptLanguage}</Badge></CardTitle></CardHeader>
              <CardContent><p className="text-sm text-slate-600 italic">"{closeout.transcript}"</p>
                {closeout.translatedSummary && <div className="mt-2 pt-2 border-t"><div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">English translation</div><p className="text-sm text-slate-600">{closeout.translatedSummary}</p></div>}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> RoseOS Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-700">{closeout.aiSummary}</p>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Work Performed</div>
                  <p className="text-sm">{closeout.workPerformed}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Materials Detected</div>
                    <div className="flex flex-wrap gap-1">{closeout.materialsDetected.map((m) => <Badge key={m} variant="secondary" className="text-[10px] flex items-center gap-1"><Wrench className="w-2.5 h-2.5" />{m}</Badge>)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Labor</div>
                    <p className="text-sm">{closeout.laborSuggested}</p>
                  </div>
                </div>
                {closeout.missingInfo.length > 0 && <div className="text-xs bg-amber-500/10 text-amber-800 border border-amber-500/20 rounded px-2 py-1.5">Missing: {closeout.missingInfo.join(", ")}</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Editable Drafts</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Billing Lines (draft)</label>
                  <Textarea value={billing} onChange={(e) => setBilling(e.target.value)} rows={4} className="text-sm font-mono" disabled={alreadySubmitted && !submitted} data-testid="textarea-billing" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Customer Update (draft)</label>
                  <Textarea value={customerText} onChange={(e) => setCustomerText(e.target.value)} rows={2} className="text-sm" disabled={alreadySubmitted && !submitted} data-testid="textarea-customer" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Portal Update (draft)</label>
                  <Textarea value={portal} onChange={(e) => setPortal(e.target.value)} rows={2} className="text-sm" disabled={alreadySubmitted && !submitted} data-testid="textarea-portal" />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className={closeout.status === "Approved" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : closeout.status === "Sent Back" ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-blue-500/10 text-blue-600 border-blue-500/20"}>{submitted ? "Submitted for Review" : closeout.status}</Badge>
              <Button className="bg-primary text-white" onClick={submitForReview} disabled={submitted || closeout.status === "Approved"} data-testid="button-submit-review">Submit Draft for Review</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
