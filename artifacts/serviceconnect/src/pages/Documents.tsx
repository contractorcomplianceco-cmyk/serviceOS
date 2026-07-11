import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { shortDate } from "@/lib/ui";
import { FileText, AlertTriangle, ShieldCheck, Filter } from "lucide-react";

export default function Documents() {
  const { documents, customers } = useAppStore();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");

  const filters = ["all", "Valid", "Expiring Soon", "Expired"];
  const filtered = documents.filter((d) => filter === "all" || d.status === filter);
  const attention = documents.filter((d) => d.status === "Expiring Soon" || d.status === "Expired");

  const statusStyle = (s: string) =>
    s === "Valid" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
    : s === "Expiring Soon" ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
    : "bg-destructive/10 text-destructive border-destructive/20";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Documents & Compliance</h1>
        <p className="text-muted-foreground">COIs, W-9s, contracts, and portal rules with expiration tracking.</p>
      </div>

      {attention.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <div><span className="font-semibold">{attention.length} document{attention.length > 1 ? "s need" : " needs"} attention.</span> Expired or expiring compliance docs may block work at those customers.</div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === f ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`} data-testid={`button-doc-filter-${f}`}>{f === "all" ? "All" : f}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((d) => {
          const c = customers.find((cc) => cc.id === d.customerId);
          return (
            <Card key={d.id} data-testid={`document-${d.id}`}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-slate-500" /></div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{c?.name} · {d.type}</div>
                    <div className="text-xs text-muted-foreground mt-1">Visibility: {d.visibility}{d.expiration ? ` · Expires ${shortDate(d.expiration)}` : ""}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline" className={statusStyle(d.status)}>{d.status === "Valid" ? <ShieldCheck className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}{d.status}</Badge>
                  {d.status !== "Valid" && <Button size="sm" variant="outline" onClick={() => toast({ title: "Renewal requested", description: `Draft request sent for ${d.name}. Review before emailing the customer.` })} data-testid={`button-request-${d.id}`}>Request Renewal</Button>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
