import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { priorityClass, statusClass, relativeDay } from "@/lib/ui";
import { Wrench, MapPin, Clock, Mic, LogOut } from "lucide-react";

export default function TechnicianMobile() {
  const { currentUser, workOrders, customers, locations, closeouts, setCurrentUserId } = useAppStore();
  const [, navigate] = useLocation();

  const myJobs = workOrders
    .filter((w) => w.assignedTechnicianId === currentUser?.id && !["Closed", "Cancelled", "Invoiced"].includes(w.status))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div className="min-h-[100dvh] bg-slate-100 flex flex-col">
      <header className="bg-slate-900 text-white px-5 py-4 sticky top-0 z-20 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-base font-bold leading-tight tracking-tight">ServiceConnect Field</div>
              <div className="text-xs text-blue-300 font-medium leading-tight mt-0.5">{currentUser?.name}</div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => { setCurrentUserId("u1"); navigate("/login"); }} data-testid="button-logout">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 space-y-6 max-w-2xl mx-auto w-full">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight" data-testid="text-page-title">Today's Route</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">{myJobs.length} active {myJobs.length === 1 ? "job" : "jobs"} assigned</p>
        </div>

        {myJobs.length === 0 ? (
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Route Clear</h3>
              <p className="text-sm text-slate-500">No active jobs assigned at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {myJobs.map((wo, index) => {
              const c = customers.find((cc) => cc.id === wo.customerId);
              const loc = locations.find((l) => l.id === wo.locationId);
              const hasCloseout = closeouts.some((co) => co.workOrderId === wo.id);
              
              return (
                <Card 
                  key={wo.id} 
                  className="overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-md transition-all bg-white animate-in slide-in-from-bottom-4 fade-in duration-500" 
                  style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
                  data-testid={`tech-job-${wo.id}`}
                >
                  <CardHeader className="p-4 pb-0 flex flex-row items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold tracking-wider text-slate-500 mb-1">{wo.number} · {wo.type}</div>
                      <CardTitle className="text-lg font-bold text-slate-900 leading-tight">{c?.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className={`shrink-0 uppercase font-bold tracking-wider text-[10px] ${priorityClass(wo.priority)}`}>
                      {wo.priority}
                    </Badge>
                  </CardHeader>
                  
                  <CardContent className="p-4 space-y-4">
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                      {wo.description}
                    </p>

                    <div className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-100">
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" /> 
                        <div className="text-sm font-medium text-slate-700 leading-tight">
                          {loc?.name}<br/>
                          <span className="text-slate-500 font-normal">{loc?.address}, {loc?.city}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" /> 
                        <div className="text-sm font-medium text-slate-700">
                          {wo.timeWindow ?? relativeDay(wo.dueDate)}
                        </div>
                      </div>
                    </div>

                    {wo.importantNotes && (
                      <div className="text-xs font-medium bg-amber-500/10 text-amber-800 border border-amber-500/20 rounded-lg px-3 py-2.5 flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        {wo.importantNotes}
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="p-4 pt-0 flex flex-col gap-3">
                    <div className="flex items-center justify-between w-full mb-1">
                      <Badge variant="outline" className={`font-semibold ${statusClass(wo.status)}`}>
                        {wo.status}
                      </Badge>
                      {hasCloseout && (
                        <Badge variant="outline" className="text-[10px] text-blue-600 bg-blue-500/10 border-blue-500/20 uppercase tracking-wider font-bold">
                          Draft Pending
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-3 w-full">
                      <Button 
                        size="lg" 
                        variant="outline" 
                        className="flex-1 bg-white border-slate-200 shadow-sm text-slate-700 font-bold h-12 rounded-xl"
                        onClick={() => navigate(`/work-orders/${wo.id}`)} 
                        data-testid={`button-details-${wo.id}`}
                      >
                        Details
                      </Button>
                      <Button 
                        size="lg" 
                        className="flex-1 bg-primary text-white shadow-md hover:bg-primary/90 font-bold h-12 rounded-xl" 
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