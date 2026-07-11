import { useState } from "react";
import { Loader2, AlertCircle, FileText, Check, X } from "lucide-react";
import {
  useListPortalQuotes,
  useDecidePortalQuote,
  QuoteDecisionInputDecision,
  type PortalQuote,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { money, shortDate } from "@/lib/ui";

type Decision = typeof QuoteDecisionInputDecision[keyof typeof QuoteDecisionInputDecision];

const GREEN = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
const AMBER = "bg-amber-500/10 text-amber-600 border-amber-500/30";
const RED = "bg-destructive/10 text-destructive border-destructive/20";
const SLATE = "bg-slate-100 text-slate-600 border-slate-200";

function quoteStatusClass(status: string): string {
  switch (status) {
    case "Approved":
      return GREEN;
    case "Sent":
      return AMBER;
    case "Rejected":
      return RED;
    default:
      return SLATE;
  }
}

export default function PortalQuotes() {
  const { data, isLoading, isError } = useListPortalQuotes();
  const decideMutation = useDecidePortalQuote();
  const { toast } = useToast();

  const [dialog, setDialog] = useState<{ quote: PortalQuote; decision: Decision } | null>(null);
  const [note, setNote] = useState("");

  const openDialog = (quote: PortalQuote, decision: Decision) => {
    setNote("");
    setDialog({ quote, decision });
  };

  const confirmDecision = async () => {
    if (!dialog) return;
    try {
      await decideMutation.mutateAsync({
        id: dialog.quote.id,
        data: {
          decision: dialog.decision,
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      });
      toast({
        title: dialog.decision === QuoteDecisionInputDecision.Approved ? "Quote approved" : "Quote rejected",
        description: `${dialog.quote.number} has been ${dialog.decision.toLowerCase()}.`,
      });
      setDialog(null);
    } catch {
      toast({ title: "Action failed", description: "Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="px-6 py-6 space-y-5 animate-in fade-in duration-500">
      <div>
        <h1 className="text-[28px] leading-none font-bold tracking-tight text-sc" data-testid="text-portal-page-title">
          Quotes
        </h1>
        <p className="text-sc-2 mt-2 text-sm">Review and respond to quotes sent to your account.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24" data-testid="loading-portal-quotes">
          <Loader2 className="w-8 h-8 animate-spin text-sc-blue" />
        </div>
      ) : isError ? (
        <div className="px-6 py-16 text-center" data-testid="error-portal-quotes">
          <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
          <p className="text-sc-2 mt-3">We couldn't load your quotes.</p>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="sc-panel p-12 text-center" data-testid="empty-portal-quotes">
          <FileText className="w-10 h-10 mx-auto text-sc-3" />
          <p className="text-sc-2 mt-3 font-medium">No quotes yet</p>
          <p className="text-sc-3 text-sm mt-1">Quotes from our team will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((quote) => {
            const isSent = quote.status === "Sent";
            return (
              <div key={quote.id} data-testid={`card-portal-quote-${quote.id}`} className="sc-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-sc">{quote.number}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-md border ${quoteStatusClass(quote.status)}`}>{quote.status}</span>
                    </div>
                    <div className="text-sm text-sc-2 mt-1">{quote.title}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-sc">{money(quote.amount)}</div>
                    {quote.validUntil && <div className="text-[11px] text-sc-3 mt-0.5">Valid until {shortDate(quote.validUntil)}</div>}
                  </div>
                </div>

                {quote.lines.length > 0 && (
                  <div className="mt-4 rounded-lg overflow-hidden" style={{ border: "1px solid var(--sc-line)" }}>
                    {quote.lines.map((line, i) => (
                      <div
                        key={line.id}
                        className="flex items-center justify-between px-4 py-2.5 text-sm"
                        style={{ background: i % 2 === 0 ? "var(--sc-elevated)" : "transparent" }}
                      >
                        <span className="text-sc-2">{line.description}</span>
                        <span className="text-sc font-medium">{line.quantity} × {money(line.rate)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {quote.notes && <p className="text-xs text-sc-3 mt-3">{quote.notes}</p>}

                {isSent && (
                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-panel-subtle">
                    <Button
                      onClick={() => openDialog(quote, QuoteDecisionInputDecision.Approved)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      data-testid={`button-approve-quote-${quote.id}`}
                    >
                      <Check className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button
                      onClick={() => openDialog(quote, QuoteDecisionInputDecision.Rejected)}
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      data-testid={`button-reject-quote-${quote.id}`}
                    >
                      <X className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                )}

                {quote.decidedAt && (
                  <p className="text-[11px] text-sc-3 mt-3">Decision recorded {shortDate(quote.decidedAt)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent data-testid="dialog-quote-decision">
          <DialogHeader>
            <DialogTitle>
              {dialog?.decision === QuoteDecisionInputDecision.Approved ? "Approve" : "Reject"} {dialog?.quote.number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-sc-2">
              {dialog?.decision === QuoteDecisionInputDecision.Approved
                ? "Confirm you'd like to approve this quote. Our team will follow up on next steps."
                : "Let us know why you're rejecting this quote (optional)."}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="quote-note" className="text-sc-2 text-xs uppercase tracking-wider font-semibold">Note (optional)</Label>
              <Textarea
                id="quote-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note…"
                data-testid="input-quote-decision-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)} data-testid="button-cancel-quote-decision">
              Cancel
            </Button>
            <Button
              onClick={confirmDecision}
              disabled={decideMutation.isPending}
              className={dialog?.decision === QuoteDecisionInputDecision.Approved ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-destructive hover:bg-destructive/90 text-white"}
              data-testid="button-confirm-quote-decision"
            >
              {decideMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : dialog?.decision === QuoteDecisionInputDecision.Approved ? "Approve Quote" : "Reject Quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
