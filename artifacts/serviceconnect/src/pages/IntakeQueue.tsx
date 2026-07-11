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
          <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">Intake Queue</h1>
          <p className="text-sc-2 mt-1 text-sm">
            Unprocessed requests from all channels. RoseOS triages and suggests next steps.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="sc-elevated border-panel-subtle text-sc-2 font-medium px-3 py-1">
            {intake.length} pending
          </Badge>
        </div>
      </div>

      {intake.length === 0 ? (
        <Card className="sc-panel shadow-sm">
          <CardContent className="py-16 text-center text-sc-3 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full sc-elevated flex items-center justify-center">
              <Inbox className="w-6 h-6 text-sc-3" />
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
              <Card key={item.id} className="sc-panel shadow-sm overflow-hidden transition-shadow hover:shadow-md hover:border-panel-strong" data-testid={`intake-${item.id}`}>
                <div className="flex flex-col lg:flex-row">
                  {/* Left: Triage Data */}
                  <div className="p-5 flex-1 flex items-start gap-4 border-b lg:border-b-0 lg:border-r border-panel-subtle">
                    <div className="w-10 h-10 rounded-lg sc-elevated flex items-center justify-center shrink-0">
                      <SourceIcon className="w-5 h-5 text-sc-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sc text-sm">{customer?.name}</span>
                        <span className="text-xs text-sc-3 font-medium uppercase tracking-wider">· {location?.name ?? "No location"}</span>
                        <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider", priorityClass(item.priority))}>{item.priority}</Badge>
                        <Badge variant="outline" className="text-[10px] sc-elevated text-sc-2 border-panel-subtle">{item.source}</Badge>
                      </div>
                      <p className="text-sm text-sc-2 mt-2 leading-relaxed">{item.description}</p>
                      
                      <div className="flex items-center gap-3 mt-4 text-xs text-sc-3 flex-wrap font-medium">
                        <span className="sc-elevated px-2 py-1 rounded border border-panel-subtle">Requested {shortDate(item.requestedDate)}</span>
                        {item.hasAttachments && <span className="flex items-center gap-1.5 sc-elevated px-2 py-1 rounded border border-panel-subtle"><Paperclip className="w-3.5 h-3.5" /> Attachments</span>}
                        {item.duplicateOf && <span className="flex items-center gap-1.5 text-[color:var(--sc-orange)] bg-[rgba(255,157,24,0.1)] px-2 py-1 rounded border border-[rgba(255,157,24,0.2)]"><Copy className="w-3.5 h-3.5" /> Possible duplicate</span>}
                        {item.missingFields.length > 0 && (
                          <span className="flex items-center gap-1.5 text-[color:var(--sc-orange)] bg-[rgba(255,157,24,0.1)] px-2 py-1 rounded border border-[rgba(255,157,24,0.2)]"><AlertTriangle className="w-3.5 h-3.5" /> Missing: {item.missingFields.join(", ")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Right: RoseOS Panel */}
                  <div className="w-full lg:w-80 sc-inner p-5 flex flex-col justify-between relative overflow-hidden shrink-0 group circuit-texture">
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" style={{ background: "radial-gradient(circle, rgba(67,166,255,0.25), transparent 70%)" }} />
                    
                    <div className="relative z-10">
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="flex items-center gap-1.5 text-sc-blue text-xs font-semibold uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5" /> RoseOS Draft
                        </div>
                        <Badge variant="outline" className="text-[9px] text-[color:var(--sc-orange)] border-[rgba(255,157,24,0.3)] bg-[rgba(255,157,24,0.1)] uppercase tracking-widest font-bold">
                          Needs Human Approval
                        </Badge>
                      </div>
                      
                      <div className="text-sm font-medium text-white leading-tight mb-4">
                        {item.suggestedAction}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 relative z-10">
                      <Button size="sm" className="text-white text-xs h-8 flex-1 blue-glow-soft" style={{ background: 'var(--sc-btn)', border: '1px solid var(--sc-btn-highlight)' }} onClick={() => { dismissIntake(item.id); toast({ title: "Draft Approved", description: `Action executed for ${customer?.name}.` }); }} data-testid={`button-create-wo-${item.id}`}>
                        <Check className="w-3.5 h-3.5 mr-1.5" /> Approve
                      </Button>
                      <div className="flex gap-2 flex-1">
                        <Button size="sm" variant="outline" className="text-sc-2 hover:text-white text-xs h-8 flex-1" style={{ background: 'var(--sc-elevated)', border: '1px solid var(--sc-line)' }} onClick={() => dismissIntake(item.id)}>
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="text-sc-3 hover:text-sc hover:bg-white/[0.04] text-xs h-8 px-2" onClick={() => dismissIntake(item.id)} data-testid={`button-dismiss-intake-${item.id}`}>
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
