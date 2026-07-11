import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { priorityClass, statusClass, relativeDay } from "@/lib/ui";
import { Wrench, MapPin, Clock, Mic, LogOut, LogIn, CheckCircle2 } from "lucide-react";

const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—";

export default function TechnicianMobile() {
  const { currentUser, workOrders, customers, locations, closeouts, technicianCheckIn, technicianCheckOut, setCurrentUserId } = useAppStore();
  const [, navigate] = useLocation();

  const myJobs = workOrders
    .filter((w) => w.assignedTechnicianId === currentUser?.id && !["Closed", "Cancelled", "Invoiced"].includes(w.status))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "var(--sc-bg)" }}>
      <header className="px-5 py-4 sticky top-0 z-20 shadow-md border-b border-panel" style={{ background: "var(--sc-bg-deep)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]" style={{ background: "var(--sc-btn)" }}>
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-base font-bold leading-tight tracking-tight text-sc">ServiceConnect Field</div>
              <div className="text-xs font-medium leading-tight mt-0.5" style={{ color: "var(--sc-blue)" }}>{currentUser?.name}</div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-sc-2 hover:text-white hover:bg-white/[0.05]" onClick={() => { setCurrentUserId("u1"); navigate("/login"); }} data-testid="button-logout">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 space-y-6 max-w-2xl mx-auto w-full">
        <div>
          <h1 className="text-2xl font-bold text-sc tracking-tight" data-testid="text-page-title">Today's Route</h1>
          <p className="text-sm font-medium text-sc-2 mt-1">{myJobs.length} active {myJobs.length === 1 ? "job" : "jobs"} assigned</p>
        </div>

        {myJobs.length === 0 ? (
          <Card className="sc-panel border-panel shadow-sm">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 sc-elevated">
                <Wrench className="w-8 h-8 text-sc-3" />
              </div>
              <h3 className="text-lg font-semibold text-sc mb-1">Route Clear</h3>
              <p className="text-sm text-sc-2">No active jobs assigned at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {myJobs.map((wo, index) => {
              const c = customers.find((cc) => cc.id === wo.customerId);
              const loc = locations.find((l) => l.id === wo.locationId);
              const hasCloseout = closeouts.some((co) => co.workOrderId === wo.id);
              const latestTrip = wo.trips[wo.trips.length - 1];
              const activeTrip = latestTrip && latestTrip.checkIn && !latestTrip.checkOut ? latestTrip : null;
              
              return (
                <Card 
                  key={wo.id} 
                  className="sc-card overflow-hidden shadow-sm hover:shadow-md transition-all animate-in slide-in-from-bottom-4 fade-in duration-500" 
                  style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
                  data-testid={`tech-job-${wo.id}`}
                >
                  <CardHeader className="p-4 pb-0 flex flex-row items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold tracking-wider text-sc-3 mb-1">{wo.number} · {wo.type}</div>
                      <CardTitle className="text-lg font-bold text-sc leading-tight">{c?.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className={`shrink-0 uppercase font-bold tracking-wider text-[10px] ${priorityClass(wo.priority)}`} style={{ background: "var(--sc-elevated)", borderColor: "var(--sc-line)" }}>
                      {wo.priority}
                    </Badge>
                  </CardHeader>
                  
                  <CardContent className="p-4 space-y-4">
                    <p className="text-sm text-sc-2 leading-relaxed font-medium">
                      {wo.description}
                    </p>

                    <div className="rounded-lg p-3 space-y-2 sc-inner">
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-sc-blue mt-0.5 shrink-0" /> 
                        <div className="text-sm font-medium text-sc leading-tight">
                          {loc?.name}<br/>
                          <span className="text-sc-2 font-normal">{loc?.address}, {loc?.city}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-sc-blue shrink-0" /> 
                        <div className="text-sm font-medium text-sc">
                          {wo.timeWindow ?? relativeDay(wo.dueDate)}
                        </div>
                      </div>
                    </div>

                    {wo.importantNotes && (
                      <div className="text-xs font-medium rounded-lg px-3 py-2.5 flex items-start gap-2" style={{ background: "rgba(255,157,24,0.1)", color: "var(--sc-orange)", border: "1px solid rgba(255,157,24,0.2)" }}>
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "var(--sc-orange)" }} />
                        {wo.importantNotes}
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="p-4 pt-0 flex flex-col gap-3">
                    <div className="flex items-center justify-between w-full mb-1">
                      <Badge variant="outline" className={`font-semibold ${statusClass(wo.status)}`} style={{ background: "var(--sc-elevated)", borderColor: "var(--sc-line)" }}>
                        {wo.status}
                      </Badge>
                      {hasCloseout && (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "var(--sc-blue)", background: "rgba(67,166,255,0.1)", borderColor: "rgba(67,166,255,0.2)" }}>
                          Draft Pending
                        </Badge>
                      )}
                    </div>
                    <div className="w-full rounded-lg p-3 sc-inner flex items-center justify-between gap-3">
                      <div className="text-xs font-medium text-sc-2 leading-tight">
                        {activeTrip ? (
                          <span className="flex items-center gap-1.5" style={{ color: "var(--sc-blue)" }}>
                            <Clock className="w-3.5 h-3.5 shrink-0" /> On site since {fmtTime(activeTrip.checkIn)}
                          </span>
                        ) : latestTrip?.checkOut ? (
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--sc-green)" }} /> Last trip {fmtTime(latestTrip.checkIn)} – {fmtTime(latestTrip.checkOut)}
                          </span>
                        ) : (
                          <span className="text-sc-3">Not checked in</span>
                        )}
                      </div>
                      {activeTrip ? (
                        <Button
                          size="sm"
                          className="text-white shadow-md font-bold h-10 rounded-xl hover:opacity-90 transition-opacity shrink-0"
                          style={{ background: "var(--sc-green)", border: "1px solid var(--sc-green)" }}
                          onClick={() => technicianCheckOut(wo.id)}
                          data-testid={`button-checkout-${wo.id}`}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1.5" /> Check Out
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="text-white shadow-md font-bold h-10 rounded-xl blue-glow-soft hover:opacity-90 transition-opacity shrink-0"
                          style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }}
                          onClick={() => technicianCheckIn(wo.id)}
                          data-testid={`button-checkin-${wo.id}`}
                        >
                          <LogIn className="w-4 h-4 mr-1.5" /> Check In
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-3 w-full">
                      <Button 
                        size="lg" 
                        variant="outline" 
                        className="flex-1 font-bold h-12 rounded-xl text-sc-2 hover:text-white transition-colors"
                        style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}
                        onClick={() => navigate(`/work-orders/${wo.id}`)} 
                        data-testid={`button-details-${wo.id}`}
                      >
                        Details
                      </Button>
                      <Button 
                        size="lg" 
                        className="flex-1 text-white shadow-md font-bold h-12 rounded-xl blue-glow-soft hover:opacity-90 transition-opacity" 
                        style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }}
                        onClick={() => navigate(`/tech/voiceconnect/${wo.id}`)} 
                        data-testid={`button-voiceconnect-${wo.id}`}
                      >
                        <Mic className="w-4 h-4 mr-2" /> 
                        {hasCloseout ? "View Draft" : "Close Out"}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
