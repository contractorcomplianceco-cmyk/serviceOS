import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { Loader2, Lock, Building2 } from "lucide-react";
import logoFull from "@/assets/logo-full.png";

export default function PortalLogin() {
  const { login, loginPending, loginError } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email.trim(), password);
      navigate("/portal");
    } catch {
      // Error surfaced via loginError from the auth context.
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans" style={{ background: "var(--sc-bg)" }}>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(67,166,255,0.05)" }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(18,104,243,0.05)" }} />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <img src={logoFull} alt="ServiceConnect with RoseOS Intelligence" className="w-full max-w-[340px] h-auto mx-auto mb-3 object-contain" />
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--sc-blue)" }}>Customer Portal</p>
          <p className="text-sc-2 text-base font-medium max-w-sm mx-auto">
            Welcome back. Sign in to view your work orders, quotes, invoices, and more.
          </p>
        </div>

        <Card className="sc-panel backdrop-blur-xl border-panel">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-5 text-sc-2 text-sm font-medium">
              <Building2 className="w-4 h-4 text-sc-blue" /> Customer Sign In
            </div>
            <form onSubmit={submit} className="space-y-4" data-testid="portal-login-form">
              <div className="space-y-1.5">
                <Label htmlFor="portal-email" className="text-sc-2 text-xs uppercase tracking-wider font-semibold">Email</Label>
                <Input
                  id="portal-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  data-testid="input-portal-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="portal-password" className="text-sc-2 text-xs uppercase tracking-wider font-semibold">Password</Label>
                <Input
                  id="portal-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  data-testid="input-portal-password"
                />
              </div>

              {loginError && (
                <div className="text-sm font-medium text-destructive flex items-center gap-2" data-testid="portal-login-error">
                  <Lock className="w-4 h-4" /> {loginError}
                </div>
              )}

              <Button type="submit" className="w-full bg-primary text-white font-semibold" disabled={loginPending} data-testid="button-portal-login">
                {loginPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
