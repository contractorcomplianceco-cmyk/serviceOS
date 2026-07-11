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
      case "Valid": return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
      case "Expiring Soon": return "bg-amber-500/10 text-amber-700 border-amber-500/30";
      case "Needs Review": return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      case "Expired":
      case "Missing":
      default: return "bg-destructive/10 text-destructive border-destructive/20";
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Documents & Compliance</h1>
          <p className="text-slate-500 mt-1 text-sm">Customer COIs, W-9s, contracts, and portal rules with automated expiration tracking.</p>
        </div>
      </div>

      {attention.length > 0 && (
        <div className="flex items-start gap-3 bg-destructive/5 border border-destructive/20 rounded-xl p-4 text-sm text-destructive relative overflow-hidden shadow-sm">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-destructive" />
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-destructive" />
          <div>
            <span className="font-semibold block text-base mb-0.5">Action Required: {attention.length} documents need attention</span>
            <p className="text-destructive/80">Expired or missing compliance documents (like COIs and W-9s) may block work orders or invoice payments for these customers.</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <div className="flex flex-wrap gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
          {filters.map((f) => (
            <button 
              key={f} 
              onClick={() => setFilter(f)} 
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === f ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}`} 
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
            <Card key={d.id} data-testid={`document-${d.id}`} className="border-slate-200/60 shadow-sm bg-white hover:shadow-md transition-shadow group flex flex-col">
              <CardContent className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${d.status === 'Valid' ? 'bg-emerald-50 text-emerald-600' : d.status === 'Expiring Soon' ? 'bg-amber-50 text-amber-600' : 'bg-destructive/10 text-destructive'}`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <div className="font-semibold text-slate-900 text-sm truncate" title={d.name}>{d.name}</div>
                      <Badge variant="outline" className={`mt-1.5 ${statusStyle(d.status)} px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide`}>
                        <StatusIcon status={d.status} />
                        {d.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-5 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 font-medium truncate">{c?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">Type: <span className="font-medium text-slate-900">{d.type}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Eye className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">Visibility: <span className="font-medium text-slate-900">{d.visibility}</span></span>
                  </div>
                  {d.expiration && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">Expires: <span className={`font-medium ${d.status === 'Expired' ? 'text-destructive' : d.status === 'Expiring Soon' ? 'text-amber-600' : 'text-slate-900'}`}>{shortDate(d.expiration)}</span></span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 mt-auto flex gap-2">
                  {d.status !== "Valid" ? (
                    <Button 
                      size="sm" 
                      className="w-full bg-primary text-white hover:bg-primary/90 shadow-sm" 
                      onClick={() => toast({ title: "Renewal requested", description: `Draft email generated to request ${d.type} from ${c?.name}.` })} 
                      data-testid={`button-request-${d.id}`}
                    >
                      <Send className="w-3.5 h-3.5 mr-2" /> Request Renewal
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="w-full bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
          <div className="col-span-1 md:col-span-2 xl:col-span-3 p-12 text-center text-slate-500 bg-white border border-slate-200 border-dashed rounded-xl">
            No documents found matching this filter.
          </div>
        )}
      </div>
    </div>
  );
}
