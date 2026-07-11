import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { roleDescription } from "@/lib/permissions";
import { RotateCcw, ShieldCheck, Users } from "lucide-react";

export default function Settings() {
  const { users, currentUser, setCurrentUserId, resetData } = useAppStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const guardrails = [
    { label: "AI may auto-schedule jobs", enabled: false, locked: true },
    { label: "AI may auto-send customer messages", enabled: false, locked: true },
    { label: "AI may auto-create invoices", enabled: false, locked: true },
    { label: "VoiceConnect output saved as draft", enabled: true, locked: true },
    { label: "Require supervisor review before billing", enabled: true, locked: false },
    { label: "Show RoseOS recommendations", enabled: true, locked: false },
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="text-page-title">Settings</h1>
        <p className="text-muted-foreground">Roles, permissions, AI guardrails, and demo controls.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Active User & Role</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Switch the active user to explore permission-gated views. Currently signed in as <span className="font-medium text-slate-900">{currentUser?.name}</span> ({currentUser?.role}).</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {users.map((u) => (
              <button key={u.id} onClick={() => { setCurrentUserId(u.id); toast({ title: "Switched user", description: `Now viewing as ${u.name} — ${u.role}.` }); }} className={`text-left p-3 rounded-lg border transition-colors ${currentUser?.id === u.id ? "border-primary bg-primary/5" : "hover:border-slate-300"}`} data-testid={`user-switch-${u.id}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{u.name}</div>
                  {currentUser?.id === u.id && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">Active</Badge>}
                </div>
                <div className="text-xs text-primary">{u.role}</div>
                <div className="text-xs text-muted-foreground mt-1">{roleDescription(u.role)}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> AI Guardrails</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm text-muted-foreground mb-3">Core safety rules keep RoseOS advisory. Locked rules cannot be disabled in this prototype.</p>
          {guardrails.map((g) => (
            <div key={g.label} className="flex items-center justify-between py-2.5 border-b last:border-0">
              <Label className="text-sm font-normal flex items-center gap-2">{g.label}{g.locked && <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-500">Locked</Badge>}</Label>
              <Switch checked={g.enabled} disabled={g.locked} data-testid={`switch-${g.label}`} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader><CardTitle className="text-base text-destructive flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Demo Controls</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Reset all data back to the seeded demo state.</p>
          <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/5" onClick={() => { resetData(); toast({ title: "Data reset", description: "All demo data restored to defaults." }); navigate("/"); }} data-testid="button-reset-data">Reset Demo Data</Button>
        </CardContent>
      </Card>
    </div>
  );
}
