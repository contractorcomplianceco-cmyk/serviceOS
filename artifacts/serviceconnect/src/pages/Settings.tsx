import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { roleDescription } from "@/lib/permissions";
import { RotateCcw, ShieldCheck, Users, Settings2, UserCircle2, HardHat, FileText, Database } from "lucide-react";

export default function Settings() {
  const { users, currentUser, setCurrentUserId, resetData } = useAppStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const guardrails = [
    { label: "AI may auto-schedule jobs", enabled: false, locked: true, desc: "Never automatically assign technicians to jobs." },
    { label: "AI may auto-send customer messages", enabled: false, locked: true, desc: "Never communicate externally without approval." },
    { label: "AI may auto-create invoices", enabled: false, locked: true, desc: "Never generate financial records automatically." },
    { label: "VoiceConnect output saved as draft", enabled: true, locked: true, desc: "All AI extracted data saves as a draft first." },
    { label: "Require supervisor review before billing", enabled: true, locked: false, desc: "Technician closeouts need manager sign-off." },
    { label: "Show RoseOS recommendations", enabled: true, locked: false, desc: "Display AI suggestions in the Intelligence panel." },
  ];

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">Settings</h1>
        <p className="text-sc-2 mt-1 text-sm">
          Roles, permissions, AI guardrails, and system configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Role Simulator */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="sc-panel border-0 bg-[rgba(67,166,255,0.05)] shadow-none">
             <CardContent className="p-6">
               <div className="w-12 h-12 rounded-full text-white flex items-center justify-center mb-4 blue-glow-soft" style={{background:'var(--sc-btn)'}}>
                 <UserCircle2 className="w-6 h-6" />
               </div>
               <h3 className="text-lg font-bold text-sc mb-1">Current Session</h3>
               <div className="text-sm font-medium text-sc-blue mb-3">{currentUser.name} — {currentUser.role}</div>
               <p className="text-sm text-sc-2 mb-6">{roleDescription(currentUser.role)}</p>
               <div className="space-y-2">
                 <h4 className="text-xs font-bold text-sc-3 uppercase tracking-wider">Switch Role Context</h4>
                 <div className="space-y-1">
                   {users.map((u) => (
                     <button 
                       key={u.id} 
                       onClick={() => { setCurrentUserId(u.id); toast({ title: "Context switched", description: `Now viewing as ${u.name} (${u.role}).` }); }} 
                       className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between border ${currentUser?.id === u.id ? "bg-[var(--sc-elevated)] text-white font-medium border-panel-strong" : "hover:bg-white/[0.04] bg-transparent border-transparent hover:border-panel text-sc-2"}`} 
                       data-testid={`user-switch-${u.id}`}
                     >
                       <div className="flex items-center gap-2">
                         {u.role.includes("Technician") ? <HardHat className="w-4 h-4 opacity-70" /> : <FileText className="w-4 h-4 opacity-70" />}
                         {u.name}
                       </div>
                       <span className="text-[10px] opacity-70">{u.role.split(' ')[0]}</span>
                     </button>
                   ))}
                 </div>
               </div>
             </CardContent>
          </Card>
        </div>

        {/* Right Column: Settings Panels */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="sc-panel overflow-hidden border-0">
            <CardHeader className="py-5 px-6 border-b border-panel" style={{ background: "var(--sc-inner)" }}>
              <CardTitle className="text-lg font-semibold text-sc flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sc-blue" /> RoseOS Guardrails
              </CardTitle>
              <CardDescription className="text-sc-3 mt-1 text-sm">
                Core safety rules that keep AI advisory. Locked rules cannot be bypassed.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-[color:var(--sc-line-subtle)]">
              {guardrails.map((g) => (
                <div key={g.label} className="flex items-start justify-between p-5 hover:bg-white/[0.04] transition-colors">
                  <div className="flex-1 pr-4">
                    <Label className="text-sm font-semibold text-sc flex items-center gap-2 mb-1">
                      {g.label}
                      {g.locked && <Badge variant="outline" className="text-[10px] bg-transparent border-panel-strong text-sc-3 uppercase tracking-wide">Locked</Badge>}
                    </Label>
                    <p className="text-xs text-sc-3">{g.desc}</p>
                  </div>
                  <div className="pt-1">
                    <Switch checked={g.enabled} disabled={g.locked} data-testid={`switch-${g.label}`} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="sc-panel border border-destructive/20 overflow-hidden shadow-none">
            <CardHeader className="bg-[rgba(255,51,72,0.05)] py-4 px-5 border-b border-destructive/20">
              <CardTitle className="text-base font-semibold text-destructive flex items-center gap-2">
                <Database className="w-4 h-4" /> Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-sc mb-1">Reset Sandbox Data</h4>
                  <p className="text-xs text-sc-3 max-w-sm">This will clear all local storage modifications and restore the original seeded demo database.</p>
                </div>
                <Button 
                  variant="outline" 
                  className="border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors bg-transparent" 
                  onClick={() => { resetData(); toast({ title: "Data reset", description: "All demo data restored to defaults." }); navigate("/"); }} 
                  data-testid="button-reset-data"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Factory Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
