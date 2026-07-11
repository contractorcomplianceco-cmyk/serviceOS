import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { roleDescription, navFor } from "@/lib/permissions";
import { Wrench, ArrowRight, ShieldCheck } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

export default function Login() {
  const { users, setCurrentUserId } = useAppStore();
  const [, navigate] = useLocation();

  const signIn = (id: string) => {
    setCurrentUserId(id);
    const user = users.find((u) => u.id === id);
    if (user && (user.role === "Technician" || user.role === "Lead Technician" || user.role === "Subcontractor")) {
      navigate("/tech");
    } else {
      navigate("/today");
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans" style={{ background: "var(--sc-bg)" }}>
      {/* Background styling elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(67,166,255,0.05)" }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(18,104,243,0.05)" }} />

      <div className="w-full max-w-[1000px] z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4 px-4 py-2 rounded-2xl shadow-xl border-panel-subtle" style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg overflow-hidden ring-1 ring-white/10" style={{ boxShadow: "0 4px 14px rgba(18,104,243,0.3)" }}>
              <img src={logoIcon} alt="ServiceConnect" className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-sc tracking-tight leading-none">ServiceConnect</h1>
              <p className="text-xs font-semibold uppercase tracking-widest mt-1" style={{ color: "var(--sc-blue)" }}>RoseOS Intelligence</p>
            </div>
          </div>
          <p className="text-sc-2 text-lg font-medium max-w-xl mx-auto">
            Secure Command Center Authentication. Select your operational role to enter the environment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => {
            const sections = navFor(u.role).length;
            const isField = ["Technician", "Lead Technician", "Subcontractor"].includes(u.role);
            return (
              <Card 
                key={u.id} 
                className="sc-panel cursor-pointer group hover:border-[var(--sc-blue)] transition-all duration-300 overflow-hidden relative backdrop-blur-xl border-panel" 
                onClick={() => signIn(u.id)} 
                data-testid={`login-${u.id}`}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(67,166,255,0), rgba(67,166,255,0.05))" }} />
                <CardContent className="p-5 flex flex-col h-full relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center border" style={
                        isField 
                          ? { background: "rgba(255,157,24,0.1)", borderColor: "rgba(255,157,24,0.2)", color: "var(--sc-orange)" }
                          : { background: "rgba(67,166,255,0.1)", borderColor: "rgba(67,166,255,0.2)", color: "var(--sc-blue)" }
                      }>
                        {isField ? <Wrench className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      </div>
                      <div>
                        <span className="font-bold text-sc block leading-tight">{u.name}</span>
                        <Badge variant="outline" className="mt-1 bg-transparent text-[10px] uppercase font-bold tracking-wider border-panel" style={{ color: isField ? "var(--sc-orange)" : "var(--sc-2)" }}>
                          {u.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <p className="text-sm text-sc-3 leading-relaxed mb-3 line-clamp-2">
                      {roleDescription(u.role)}
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t border-panel-subtle">
                      <span className="text-xs font-mono text-sc-3 group-hover:text-[var(--sc-blue)] transition-colors">
                        {sections} MODULES
                      </span>
                      <ArrowRight className="w-4 h-4 text-sc-3 group-hover:text-[var(--sc-blue)] transition-colors transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
