import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ShieldOff, Loader2 } from "lucide-react";
import { AppProvider } from "@/lib/store";
import { AuthProvider, useAuth, roleHome } from "@/lib/auth";
import { canAccess, canApproveCloseouts, isFieldRole, type NavKey } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import AppLayout from "@/components/layout/AppLayout";

import TodayDashboard from "@/pages/TodayDashboard";
import IntakeQueue from "@/pages/IntakeQueue";
import WorkOrders from "@/pages/WorkOrders";
import WorkOrderDetail from "@/pages/WorkOrderDetail";
import DispatchCalendar from "@/pages/DispatchCalendar";
import Technicians from "@/pages/Technicians";
import Customers from "@/pages/Customers";
import CustomerDetail from "@/pages/CustomerDetail";
import Locations from "@/pages/Locations";
import Inventory from "@/pages/Inventory";
import Equipment from "@/pages/Equipment";
import Billing from "@/pages/Billing";
import Accounting from "@/pages/Accounting";
import Contracts from "@/pages/Contracts";
import Recurrence from "@/pages/Recurrence";
import Documents from "@/pages/Documents";
import Reports from "@/pages/Reports";
import Intelligence from "@/pages/Intelligence";
import Integrations from "@/pages/Integrations";
import Settings from "@/pages/Settings";
import TechnicianMobile from "@/pages/TechnicianMobile";
import VoiceConnect from "@/pages/VoiceConnect";
import SupervisorReview from "@/pages/SupervisorReview";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import { PortalShell, PortalLogin } from "@/pages/portal";

const queryClient = new QueryClient();

function AccessDenied() {
  const [, navigate] = useLocation();
  return (
    <div className="p-6 max-w-lg mx-auto" data-testid="access-denied">
      <div className="mt-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto">
          <ShieldOff className="w-7 h-7 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-sc">Access restricted</h1>
          <p className="text-muted-foreground mt-1">Your role doesn't have permission to view this section. Switch roles from Settings or the header menu to explore other views.</p>
        </div>
        <Button className="bg-primary text-white" onClick={() => navigate("/today")} data-testid="button-go-home">Back to Today</Button>
      </div>
    </div>
  );
}

function Protected({ allow, children }: { allow: (role: Role) => boolean; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Redirect to="/login" />;
  if (!allow(user.role as Role)) return <AccessDenied />;
  return <>{children}</>;
}

function FullScreenLoader() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: "var(--sc-bg)" }} data-testid="auth-loading">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--sc-blue)" }} />
    </div>
  );
}

const nav = (key: NavKey) => (role: Role) => canAccess(role, key);

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Redirect to="/login" />;
  return <Redirect to={roleHome(user.role as Role)} />;
}

function LoginRoute() {
  const { user } = useAuth();
  if (user) return <Redirect to={roleHome(user.role as Role)} />;
  return <Login />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/login" component={LoginRoute} />
      <Route path="/today">{() => <Protected allow={() => true}><TodayDashboard /></Protected>}</Route>
      <Route path="/intake">{() => <Protected allow={nav("intake")}><IntakeQueue /></Protected>}</Route>
      <Route path="/work-orders">{() => <Protected allow={nav("work-orders")}><WorkOrders /></Protected>}</Route>
      <Route path="/work-orders/:id">{() => <Protected allow={nav("work-orders")}><WorkOrderDetail /></Protected>}</Route>
      <Route path="/dispatch">{() => <Protected allow={nav("dispatch")}><DispatchCalendar /></Protected>}</Route>
      <Route path="/technicians">{() => <Protected allow={nav("technicians")}><Technicians /></Protected>}</Route>
      <Route path="/customers">{() => <Protected allow={nav("customers")}><Customers /></Protected>}</Route>
      <Route path="/customers/:id">{() => <Protected allow={nav("customers")}><CustomerDetail /></Protected>}</Route>
      <Route path="/locations">{() => <Protected allow={nav("locations")}><Locations /></Protected>}</Route>
      <Route path="/inventory">{() => <Protected allow={nav("inventory")}><Inventory /></Protected>}</Route>
      <Route path="/equipment">{() => <Protected allow={nav("equipment")}><Equipment /></Protected>}</Route>
      <Route path="/contracts">{() => <Protected allow={nav("contracts")}><Contracts /></Protected>}</Route>
      <Route path="/recurrence">{() => <Protected allow={nav("contracts")}><Recurrence /></Protected>}</Route>
      <Route path="/billing">{() => <Protected allow={nav("billing")}><Billing /></Protected>}</Route>
      <Route path="/accounting">{() => <Protected allow={nav("accounting")}><Accounting /></Protected>}</Route>
      <Route path="/documents">{() => <Protected allow={nav("documents")}><Documents /></Protected>}</Route>
      <Route path="/reports">{() => <Protected allow={nav("reports")}><Reports /></Protected>}</Route>
      <Route path="/intelligence">{() => <Protected allow={nav("intelligence")}><Intelligence /></Protected>}</Route>
      <Route path="/integrations">{() => <Protected allow={nav("integrations")}><Integrations /></Protected>}</Route>
      <Route path="/settings">{() => <Protected allow={nav("settings")}><Settings /></Protected>}</Route>
      <Route path="/review">{() => <Protected allow={canApproveCloseouts}><SupervisorReview /></Protected>}</Route>
      <Route path="/tech">{() => <Protected allow={isFieldRole}><TechnicianMobile /></Protected>}</Route>
      <Route path="/tech/voiceconnect/:id">{() => <Protected allow={isFieldRole}><VoiceConnect /></Protected>}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthedApp() {
  const { isLoading, user } = useAuth();
  const [location] = useLocation();
  if (isLoading) return <FullScreenLoader />;

  // The customer portal is a fully isolated, tenant+customer-scoped experience.
  // Portal users 403 on every staff endpoint, so they must never mount the
  // staff AppProvider/AppLayout — they get their own shell and data hooks.
  if (user?.role === "Customer Portal User") return <PortalShell />;
  if (!user && location.startsWith("/portal")) return <PortalLogin />;

  return (
    <AppProvider>
      <AppLayout>
        <Router />
      </AppLayout>
    </AppProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthedApp />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
