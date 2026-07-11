import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { roleDescription } from "@/lib/permissions";
import { navFor } from "@/lib/permissions";
import { Wrench, ArrowRight } from "lucide-react";

export default function Login() {
  const { users, setCurrentUserId } = useAppStore();
  const [, navigate] = useLocation();

  const signIn = (id: string) => {
    setCurrentUserId(id);
    const user = users.find((u) => u.id === id);
    if (user && (user.role === "Technician" || user.role === "Lead Technician" || user.role === "Subcontractor")) {
      navigate("/tech");
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center"><Wrench className="w-5 h-5 text-white" /></div>
            <span className="text-2xl font-bold text-white">ServiceConnect</span>
          </div>
          <p className="text-slate-400">with RoseOS Intelligence — choose a role to explore the platform.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {users.map((u) => (
            <Card key={u.id} className="cursor-pointer hover:border-primary transition-colors bg-white" onClick={() => signIn(u.id)} data-testid={`login-${u.id}`}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{u.name}</span>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">{u.role}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{roleDescription(u.role)}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{navFor(u.role).length} sections available</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
