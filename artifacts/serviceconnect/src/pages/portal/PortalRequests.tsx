import { useState } from "react";
import { Loader2, AlertCircle, MessageSquarePlus, Plus, CheckCircle2 } from "lucide-react";
import {
  useListPortalRequests,
  useCreatePortalRequest,
  useGetPortalMe,
  PortalRequestInputPriority,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { shortDate, statusClass, priorityClass } from "@/lib/ui";
import type { WorkOrderStatus, Priority } from "@/lib/types";

const priorities = Object.values(PortalRequestInputPriority);

export default function PortalRequests() {
  const { data, isLoading, isError } = useListPortalRequests();
  const meQuery = useGetPortalMe();
  const createMutation = useCreatePortalRequest();
  const { toast } = useToast();

  const locations = meQuery.data?.locations ?? [];
  const [locationId, setLocationId] = useState("");
  const [priority, setPriority] = useState<string>(PortalRequestInputPriority.Medium);
  const [description, setDescription] = useState("");
  const [requestedDate, setRequestedDate] = useState("");

  const canSubmit = !!locationId && description.trim().length > 0 && !createMutation.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await createMutation.mutateAsync({
        data: {
          locationId,
          priority: priority as PortalRequestInputPriority,
          description: description.trim(),
          ...(requestedDate ? { requestedDate } : {}),
        },
      });
      toast({ title: "Request submitted", description: "Our team will review your request shortly." });
      setDescription("");
      setRequestedDate("");
      setPriority(PortalRequestInputPriority.Medium);
    } catch {
      toast({ title: "Submission failed", description: "Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="px-6 py-6 space-y-5 animate-in fade-in duration-500">
      <div>
        <h1 className="text-[28px] leading-none font-bold tracking-tight text-sc" data-testid="text-portal-page-title">
          Service Requests
        </h1>
        <p className="text-sc-2 mt-2 text-sm">Submit a new request and track ones you've already sent.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <section className="sc-panel p-5 lg:col-span-2">
          <h2 className="text-[15px] font-semibold text-sc flex items-center gap-2 mb-4">
            <MessageSquarePlus className="w-4 h-4 text-sc-blue" /> New Request
          </h2>
          <form onSubmit={submit} className="space-y-4" data-testid="portal-request-form">
            <div className="space-y-1.5">
              <Label className="text-sc-2 text-xs uppercase tracking-wider font-semibold">Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger data-testid="select-request-location">
                  <SelectValue placeholder={meQuery.isLoading ? "Loading…" : "Select a location"} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id} data-testid={`option-request-location-${loc.id}`}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sc-2 text-xs uppercase tracking-wider font-semibold">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="select-request-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p} value={p} data-testid={`option-request-priority-${p}`}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="requested-date" className="text-sc-2 text-xs uppercase tracking-wider font-semibold">Preferred Date</Label>
              <Input
                id="requested-date"
                type="date"
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                data-testid="input-request-date"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="request-description" className="text-sc-2 text-xs uppercase tracking-wider font-semibold">Description</Label>
              <Textarea
                id="request-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue or service you need…"
                data-testid="input-request-description"
              />
            </div>

            <Button type="submit" className="w-full bg-primary text-white font-semibold" disabled={!canSubmit} data-testid="button-submit-request">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Submit Request</>}
            </Button>
            <p className="text-[11px] text-sc-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Requests are reviewed by our team and never auto-scheduled.
            </p>
          </form>
        </section>

        <section className="lg:col-span-3 space-y-3">
          <h2 className="text-[15px] font-semibold text-sc">Your Requests</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-24" data-testid="loading-portal-requests">
              <Loader2 className="w-8 h-8 animate-spin text-sc-blue" />
            </div>
          ) : isError ? (
            <div className="px-6 py-16 text-center" data-testid="error-portal-requests">
              <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
              <p className="text-sc-2 mt-3">We couldn't load your requests.</p>
            </div>
          ) : !data || data.length === 0 ? (
            <div className="sc-panel p-12 text-center" data-testid="empty-portal-requests">
              <MessageSquarePlus className="w-10 h-10 mx-auto text-sc-3" />
              <p className="text-sc-2 mt-3 font-medium">No requests yet</p>
              <p className="text-sc-3 text-sm mt-1">Submit your first service request using the form.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((req) => (
                <div key={req.id} data-testid={`card-portal-request-${req.id}`} className="sc-panel p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-sc">{req.number}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-md border ${statusClass(req.status as WorkOrderStatus)}`}>{req.status}</span>
                  </div>
                  <p className="text-sm text-sc-2 mt-1.5 line-clamp-2">{req.description}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityClass(req.priority as Priority)}`}>{req.priority}</span>
                    <span className="text-[11px] text-sc-3">Submitted {shortDate(req.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
