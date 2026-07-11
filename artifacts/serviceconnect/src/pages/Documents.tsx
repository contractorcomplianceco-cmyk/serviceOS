import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { shortDate } from "@/lib/ui";
import { FileText, AlertTriangle, ShieldCheck, Filter, Clock, Eye, Send, Building2 } from "lucide-react";

export default function Documents() {
  const { documents, customers } = useAppStore();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");

  const filters = ["all", "Valid", "Expiring Soon", "Expired", "Missing"];
  const filtered = documents.filter((d) => filter === "all" || d.status === filter);
  const attention = documents.filter((d) => d.status === "Expiring Soon" || d.status === "Expired" || d.status === "Missing");

  const statusStyle = (s: string) => {
    switch (s) {
      case "Valid": return { color: "var(--sc-green)", background: "rgba(56,212,119,0.1)", border: "1px solid rgba(56,212,119,0.25)" };
      case "Expiring Soon": return { color: "var(--sc-orange)", background: "rgba(255,157,24,0.12)", border: "1px solid rgba(255,157,24,0.3)" };
      case "Needs Review": return { color: "var(--sc-blue)", background: "rgba(67,166,255,0.12)", border: "1px solid rgba(67,166,255,0.3)" };
      case "Expired":
      case "Missing":
      default: return { color: "var(--sc-red)", background: "rgba(255,51,72,0.12)", border: "1px solid rgba(255,51,72,0.3)" };
    }
  };

  const statusIconClass = (s: string) => {
    switch (s) {
      case "Valid": return "text-sc-green bg-[rgba(56,212,119,0.15)]";
      case "Expiring Soon": return "text-sc-orange bg-[rgba(255,157,24,0.15)]";
      default: return "text-sc-red bg-[rgba(255,51,72,0.15)]";
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case "Valid": return <ShieldCheck className="w-3.5 h-3.5 mr-1" />;
      case "Expiring Soon": return <Clock className="w-3.5 h-3.5 mr-1" />;
      default: return <AlertTriangle className="w-3.5 h-3.5 mr-1" />;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">Documents & Compliance</h1>
          <p className="text-sc-2 mt-1 text-sm">Customer COIs, W-9s, contracts, and portal rules with automated expiration tracking.</p>
        </div>
      </div>

      {attention.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl p-4 text-sm relative overflow-hidden shadow-sm" style={{ color: "var(--sc-red)", background: "rgba(255,51,72,0.06)", border: "1px solid rgba(255,51,72,0.2)" }}>
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: "var(--sc-red)" }} />
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--sc-red)" }} />
          <div>
            <span className="font-semibold block text-base mb-0.5">Action Required: {attention.length} documents need attention</span>
            <p className="opacity-80">Expired or missing compliance documents (like COIs and W-9s) may block work orders or invoice payments for these customers.</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-sc-3" />
        <div className="flex flex-wrap gap-1 rounded-lg p-1 shadow-sm" style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}>
          {filters.map((f) => (
            <button 
              key={f} 
              onClick={() => setFilter(f)} 
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === f ? "text-sc shadow-sm" : "text-sc-2 hover:text-sc hover:bg-white/[0.04]"}`} 
              style={filter === f ? { background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" } : {}}
              data-testid={`button-doc-filter-${f.replace(' ', '-')}`}
            >
              {f === "all" ? "All Documents" : f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((d) => {
          const c = customers.find((cc) => cc.id === d.customerId);
          return (
            <Card key={d.id} data-testid={`document-${d.id}`} className="sc-panel border-none hover:border-panel-strong transition-colors group flex flex-col">
              <CardContent className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${statusIconClass(d.status)}`} style={{ 
                      color: d.status === 'Valid' ? "var(--sc-green)" : d.status === 'Expiring Soon' ? "var(--sc-orange)" : "var(--sc-red)",
                      background: d.status === 'Valid' ? "rgba(56,212,119,0.15)" : d.status === 'Expiring Soon' ? "rgba(255,157,24,0.15)" : "rgba(255,51,72,0.15)"
                    }}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <div className="font-semibold text-sc text-sm truncate" title={d.name}>{d.name}</div>
                      <Badge variant="outline" className={`mt-1.5 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide`} style={statusStyle(d.status)}>
                        <StatusIcon status={d.status} />
                        {d.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-5 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-sc-3" />
                    <span className="text-sc-2 font-medium truncate">{c?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-sc-3" />
                    <span className="text-sc-2">Type: <span className="font-medium text-sc">{d.type}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Eye className="w-4 h-4 text-sc-3" />
                    <span className="text-sc-2">Visibility: <span className="font-medium text-sc">{d.visibility}</span></span>
                  </div>
                  {d.expiration && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-sc-3" />
                      <span className="text-sc-2">Expires: <span className="font-medium" style={{ color: d.status === 'Expired' ? 'var(--sc-red)' : d.status === 'Expiring Soon' ? 'var(--sc-orange)' : 'var(--sc-text)' }}>{shortDate(d.expiration)}</span></span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-panel-subtle mt-auto flex gap-2">
                  {d.status !== "Valid" ? (
                    <Button 
                      size="sm" 
                      className="w-full text-white blue-glow-soft hover:opacity-90" 
                      style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }}
                      onClick={() => toast({ title: "Renewal requested", description: `Draft email generated to request ${d.type} from ${c?.name}.` })} 
                      data-testid={`button-request-${d.id}`}
                    >
                      <Send className="w-3.5 h-3.5 mr-2" /> Request Renewal
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="w-full text-sc-2 hover:text-white transition-colors"
                      style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-2" /> View Document
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-1 md:col-span-2 xl:col-span-3 p-12 text-center text-sc-3 border border-dashed rounded-xl sc-panel border-panel-subtle">
            No documents found matching this filter.
          </div>
        )}
      </div>
    </div>
  );
}
