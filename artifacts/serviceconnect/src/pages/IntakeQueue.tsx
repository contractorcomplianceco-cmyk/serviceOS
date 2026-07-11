import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { priorityClass, shortDate } from "@/lib/ui";
import { Mail, Globe, Server, PencilLine, Inbox, Paperclip, AlertTriangle, Copy, Sparkles, Check, Edit2 } from "lucide-react";
import { WorkOrderSource } from "@/lib/types";
import { cn } from "@/lib/utils";

const sourceIcon: Record<WorkOrderSource, typeof Mail> = {
  ServiceChannel: Server,
  Email: Mail,
  "Customer Portal": Globe,
  Manual: PencilLine,
  "Other Portal": Server,
};

export default function IntakeQueue() {
  const { intake, customers, locations, dismissIntake } = useAppStore();
  const { toast } = useToast();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Intake Queue</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Unprocessed requests from all channels. RoseOS triages and suggests next steps.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 font-medium px-3 py-1">
            {intake.length} pending
          </Badge>
        </div>
      </div>

      {intake.length === 0 ? (
        <Card className="border border-slate-200/60 shadow-sm bg-white">
          <CardContent className="py-16 text-center text-slate-500 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
              <Inbox className="w-6 h-6 text-slate-400" />
            </div>
            <span className="text-sm font-medium">Intake queue is empty.</span>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {intake.map((item) => {
            const customer = customers.find((c) => c.id === item.customerId);
            const location = locations.find((l) => l.id === item.locationId);
            const SourceIcon = sourceIcon[item.source];
            return (
              <Card key={item.id} className="border border-slate-200/60 shadow-sm bg-white overflow-hidden transition-shadow hover:shadow-md" data-testid={`intake-${item.id}`}>
                <div className="flex flex-col lg:flex-row">
                  {/* Left: Triage Data */}
                  <div className="p-5 flex-1 flex items-start gap-4 border-b lg:border-b-0 lg:border-r border-slate-100">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      <SourceIcon className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm">{customer?.name}</span>
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">· {location?.name ?? "No location"}</span>
                        <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider", priorityClass(item.priority))}>{item.priority}</Badge>
                        <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">{item.source}</Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">{item.description}</p>
                      
                      <div className="flex items-center gap-3 mt-4 text-xs text-slate-500 flex-wrap font-medium">
                        <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">Requested {shortDate(item.requestedDate)}</span>
                        {item.hasAttachments && <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-100"><Paperclip className="w-3.5 h-3.5" /> Attachments</span>}
                        {item.duplicateOf && <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100"><Copy className="w-3.5 h-3.5" /> Possible duplicate</span>}
                        {item.missingFields.length > 0 && (
                          <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100"><AlertTriangle className="w-3.5 h-3.5" /> Missing: {item.missingFields.join(", ")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Right: RoseOS Panel */}
                  <div className="w-full lg:w-80 bg-slate-900 p-5 flex flex-col justify-between relative overflow-hidden shrink-0 group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />
                    
                    <div className="relative z-10">
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="flex items-center gap-1.5 text-primary text-xs font-semibold uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5" /> RoseOS Draft
                        </div>
                        <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-400/30 bg-amber-400/10 uppercase tracking-widest font-bold">
                          Needs Human Approval
                        </Badge>
                      </div>
                      
                      <div className="text-sm font-medium text-white leading-tight mb-4">
                        {item.suggestedAction}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 relative z-10">
                      <Button size="sm" className="bg-primary text-white hover:bg-primary/90 text-xs h-8 flex-1" onClick={() => { dismissIntake(item.id); toast({ title: "Draft Approved", description: `Action executed for ${customer?.name}.` }); }} data-testid={`button-create-wo-${item.id}`}>
                        <Check className="w-3.5 h-3.5 mr-1.5" /> Approve
                      </Button>
                      <div className="flex gap-2 flex-1">
                        <Button size="sm" variant="outline" className="bg-transparent border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white text-xs h-8 flex-1" onClick={() => dismissIntake(item.id)}>
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs h-8 px-2" onClick={() => dismissIntake(item.id)} data-testid={`button-dismiss-intake-${item.id}`}>
                          Skip
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
