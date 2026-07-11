import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { priorityClass, shortDate } from "@/lib/ui";
import { Mail, Globe, Server, PencilLine, Inbox, Paperclip, AlertTriangle, Copy } from "lucide-react";
import { WorkOrderSource } from "@/lib/types";

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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Intake Queue</h1>
          <p className="text-muted-foreground">Unprocessed requests from all channels. RoseOS triages and suggests next steps.</p>
        </div>
        <Badge variant="outline" className="text-slate-500">{intake.length} pending</Badge>
      </div>

      {intake.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Inbox className="w-8 h-8 text-slate-300" /> Intake queue is empty.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {intake.map((item) => {
            const customer = customers.find((c) => c.id === item.customerId);
            const location = locations.find((l) => l.id === item.locationId);
            const SourceIcon = sourceIcon[item.source];
            return (
              <Card key={item.id} data-testid={`intake-${item.id}`}>
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <SourceIcon className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">{customer?.name}</span>
                        <span className="text-xs text-muted-foreground">· {location?.name ?? "No location"}</span>
                        <Badge variant="outline" className={priorityClass(item.priority)}>{item.priority}</Badge>
                        <Badge variant="secondary" className="text-[10px] bg-slate-100">{item.source}</Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span>Requested {shortDate(item.requestedDate)}</span>
                        {item.hasAttachments && <span className="flex items-center gap-1"><Paperclip className="w-3 h-3" /> Attachments</span>}
                        {item.duplicateOf && <span className="flex items-center gap-1 text-amber-600"><Copy className="w-3 h-3" /> Possible duplicate</span>}
                        {item.missingFields.length > 0 && (
                          <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="w-3 h-3" /> Missing: {item.missingFields.join(", ")}</span>
                        )}
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1.5 text-xs bg-primary/5 text-primary border border-primary/20 rounded-md px-2 py-1">
                        <span className="font-medium">RoseOS suggests:</span> {item.suggestedAction}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button size="sm" className="bg-primary text-white" onClick={() => { dismissIntake(item.id); toast({ title: "Work order created", description: `Draft WO created for ${customer?.name}. Assign a technician to schedule.` }); }} data-testid={`button-create-wo-${item.id}`}>
                      Create Work Order
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => dismissIntake(item.id)} data-testid={`button-dismiss-intake-${item.id}`}>
                      Dismiss
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
