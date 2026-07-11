import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { roleDescription, navFor } from "@/lib/permissions";
import { Wrench, ArrowRight, ShieldCheck, Cpu } from "lucide-react";

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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background styling elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[1000px] z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4 px-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white tracking-tight leading-none">ServiceConnect</h1>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mt-1">RoseOS Intelligence</p>
            </div>
          </div>
          <p className="text-slate-400 text-lg font-medium max-w-xl mx-auto">
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
                className="cursor-pointer group bg-slate-900/60 border-slate-800 hover:border-primary/50 hover:bg-slate-800/80 transition-all duration-300 overflow-hidden relative backdrop-blur-xl" 
                onClick={() => signIn(u.id)} 
                data-testid={`login-${u.id}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-5 flex flex-col h-full relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isField ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                        {isField ? <Wrench className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      </div>
                      <div>
                        <span className="font-bold text-white block leading-tight">{u.name}</span>
                        <Badge variant="outline" className={`mt-1 bg-transparent text-[10px] uppercase font-bold tracking-wider border-slate-700 ${isField ? 'text-amber-400' : 'text-slate-300'}`}>
                          {u.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <p className="text-sm text-slate-400 leading-relaxed mb-3 line-clamp-2">
                      {roleDescription(u.role)}
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                      <span className="text-xs font-mono text-slate-500 group-hover:text-primary transition-colors">
                        {sections} MODULES
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors transform group-hover:translate-x-1" />
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
