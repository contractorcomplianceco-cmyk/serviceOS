import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { priorityClass, statusClass, relativeDay } from "@/lib/ui";
import { Wrench, MapPin, Clock, Mic, ChevronRight, LogOut } from "lucide-react";

export default function TechnicianMobile() {
  const { currentUser, workOrders, customers, locations, closeouts, setCurrentUserId } = useAppStore();
  const [, navigate] = useLocation();

  const myJobs = workOrders
    .filter((w) => w.assignedTechnicianId === currentUser?.id && !["Closed", "Cancelled", "Invoiced"].includes(w.status))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><Wrench className="w-4 h-4 text-white" /></div>
            <div>
              <div className="text-sm font-semibold leading-tight">ServiceConnect Field</div>
              <div className="text-[11px] text-slate-400 leading-tight">{currentUser?.name}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800" onClick={() => { setCurrentUserId("u1"); navigate("/login"); }} data-testid="button-logout"><LogOut className="w-4 h-4" /></Button>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <div>
          <h1 className="text-xl font-bold text-slate-900" data-testid="text-page-title">Today's Jobs</h1>
          <p className="text-sm text-muted-foreground">{myJobs.length} assigned {myJobs.length === 1 ? "job" : "jobs"}</p>
        </div>

        {myJobs.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No active jobs assigned.</CardContent></Card>
        ) : myJobs.map((wo) => {
          const c = customers.find((cc) => cc.id === wo.customerId);
          const loc = locations.find((l) => l.id === wo.locationId);
          const hasCloseout = closeouts.some((co) => co.workOrderId === wo.id);
          return (
            <Card key={wo.id} className="overflow-hidden" data-testid={`tech-job-${wo.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900">{c?.name}</div>
                    <div className="text-xs text-muted-foreground">{wo.number} · {wo.type}</div>
                  </div>
                  <Badge variant="outline" className={priorityClass(wo.priority)}>{wo.priority}</Badge>
                </div>

                <p className="text-sm text-slate-700">{wo.description}</p>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {loc?.address}, {loc?.city}</div>
                  <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {wo.timeWindow ?? relativeDay(wo.dueDate)}</div>
                </div>

                {wo.importantNotes && <div className="text-xs bg-amber-500/10 text-amber-800 border border-amber-500/20 rounded px-2 py-1.5">{wo.importantNotes}</div>}

                <div className="flex items-center justify-between pt-1">
                  <Badge variant="outline" className={statusClass(wo.status)}>{wo.status}</Badge>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/work-orders/${wo.id}`)} data-testid={`button-details-${wo.id}`}>Details <ChevronRight className="w-3.5 h-3.5 ml-0.5" /></Button>
                    <Button size="sm" className="bg-primary text-white" onClick={() => navigate(`/tech/voiceconnect/${wo.id}`)} data-testid={`button-voiceconnect-${wo.id}`}><Mic className="w-3.5 h-3.5 mr-1" /> {hasCloseout ? "View" : "Close Out"}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
