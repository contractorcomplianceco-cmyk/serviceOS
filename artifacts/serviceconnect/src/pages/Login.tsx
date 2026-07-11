import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, roleHome, IS_DEV } from "@/lib/auth";
import type { Role } from "@/lib/types";
import { Wrench, ShieldCheck, Loader2, Lock } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

const FIELD_ROLE_LABELS = ["Technician", "Lead Technician", "Subcontractor"];

export default function Login() {
  const { login, devLogin, devUsers, loginPending, loginError } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [switching, setSwitching] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await login(email.trim(), password);
      navigate(roleHome(user.role as Role));
    } catch {
      // Error surfaced via loginError from the auth context.
    }
  };

  const quickSelect = async (id: string, role: string) => {
    setSwitching(id);
    try {
      await devLogin(id);
      navigate(roleHome(role as Role));
    } catch {
      setSwitching(null);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans" style={{ background: "var(--sc-bg)" }}>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(67,166,255,0.05)" }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(18,104,243,0.05)" }} />

      <div className="w-full max-w-[1000px] z-10">
        <div className="text-center mb-10">
          <img src={logoIcon} alt="ServiceConnect" className="w-24 h-24 mx-auto mb-6 object-contain" />
          <p className="text-sc-2 text-lg font-medium max-w-xl mx-auto">
            Secure Command Center Authentication. Sign in with your credentials to enter the environment.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <Card className="sc-panel backdrop-blur-xl border-panel">
            <CardContent className="p-6">
              <form onSubmit={submit} className="space-y-4" data-testid="login-form">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sc-2 text-xs uppercase tracking-wider font-semibold">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@serviceconnect.app"
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sc-2 text-xs uppercase tracking-wider font-semibold">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    data-testid="input-password"
                  />
                </div>

                {loginError && (
                  <div className="text-sm font-medium text-destructive flex items-center gap-2" data-testid="login-error">
                    <Lock className="w-4 h-4" /> {loginError}
                  </div>
                )}

                <Button type="submit" className="w-full bg-primary text-white font-semibold" disabled={loginPending} data-testid="button-login">
                  {loginPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {IS_DEV && devUsers.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-3 justify-center mb-4">
              <div className="h-px flex-1 max-w-[120px]" style={{ background: "var(--sc-line)" }} />
              <Badge variant="outline" className="bg-transparent text-[10px] uppercase font-bold tracking-widest border-panel" style={{ color: "var(--sc-orange)" }}>
                Dev role quick-select
              </Badge>
              <div className="h-px flex-1 max-w-[120px]" style={{ background: "var(--sc-line)" }} />
            </div>
            <p className="text-center text-xs text-sc-3 mb-4">Development only — bypasses the password but still authenticates against the backend.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {devUsers.map((u) => {
                const isField = FIELD_ROLE_LABELS.includes(u.role);
                const busy = switching === u.id;
                return (
                  <Card
                    key={u.id}
                    className="sc-panel cursor-pointer group hover:border-[var(--sc-blue)] transition-all duration-300 overflow-hidden relative backdrop-blur-xl border-panel"
                    onClick={() => quickSelect(u.id, u.role)}
                    data-testid={`login-${u.id}`}
                  >
                    <CardContent className="p-4 flex items-center gap-3 relative z-10">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center border shrink-0" style={
                        isField
                          ? { background: "rgba(255,157,24,0.1)", borderColor: "rgba(255,157,24,0.2)", color: "var(--sc-orange)" }
                          : { background: "rgba(67,166,255,0.1)", borderColor: "rgba(67,166,255,0.2)", color: "var(--sc-blue)" }
                      }>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : isField ? <Wrench className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-sc block leading-tight truncate">{u.name}</span>
                        <span className="text-xs text-sc-3 truncate block">{u.role}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
