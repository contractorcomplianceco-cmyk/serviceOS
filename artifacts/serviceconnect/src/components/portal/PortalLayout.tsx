import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ClipboardList,
  MessageSquarePlus,
  FileText,
  Receipt,
  CreditCard,
  FolderOpen,
  HardHat,
  UserCircle,
  LogOut,
  Loader2,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useGetPortalMe } from "@workspace/api-client-react";
import logoIcon from "@/assets/logo-icon.png";

const navItems: { name: string; path: string; key: string; icon: typeof LayoutDashboard }[] = [
  { name: "Dashboard", path: "/portal", key: "dashboard", icon: LayoutDashboard },
  { name: "Work Orders", path: "/portal/work-orders", key: "work-orders", icon: ClipboardList },
  { name: "Requests", path: "/portal/requests", key: "requests", icon: MessageSquarePlus },
  { name: "Quotes", path: "/portal/quotes", key: "quotes", icon: FileText },
  { name: "Invoices", path: "/portal/invoices", key: "invoices", icon: Receipt },
  { name: "Payments", path: "/portal/payments", key: "payments", icon: CreditCard },
  { name: "Documents", path: "/portal/documents", key: "documents", icon: FolderOpen },
  { name: "Equipment", path: "/portal/equipment", key: "equipment", icon: HardHat },
  { name: "Profile", path: "/portal/profile", key: "profile", icon: UserCircle },
];

export default function PortalLayout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const meQuery = useGetPortalMe();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/portal/login");
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden" style={{ background: "var(--sc-bg)" }}>
      <aside
        className="w-[264px] flex-shrink-0 flex flex-col z-20 border-r border-panel"
        style={{ background: "var(--sidebar)" }}
      >
        <div className="h-[78px] flex items-center gap-3 px-5 border-b border-panel-subtle shrink-0">
          <img
            src={logoIcon}
            alt="ServiceConnect"
            className="w-14 h-14 rounded-lg object-cover shrink-0 ring-1 ring-white/10"
          />
          <div className="flex flex-col leading-none">
            <span className="text-[17px] font-semibold tracking-tight text-sc">ServiceConnect</span>
            <span className="text-[9px] mt-1 text-sc-3 font-medium tracking-[0.18em] uppercase">
              Customer Portal
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-0.5" data-testid="nav-portal-sidebar">
          {navItems.map((item) => {
            const isActive =
              item.path === "/portal"
                ? location === "/portal"
                : location === item.path || location.startsWith(item.path + "/");
            return (
              <Link key={item.path} href={item.path}>
                <div
                  data-testid={`link-portal-${item.key}`}
                  className={cn(
                    "relative flex items-center gap-3 h-[44px] px-3.5 rounded-lg text-sm font-medium transition-all cursor-pointer group",
                    isActive ? "text-white" : "text-sc-2 hover:text-white hover:bg-white/[0.04]"
                  )}
                  style={
                    isActive
                      ? {
                          background: "linear-gradient(180deg, rgba(18,104,243,0.22), rgba(18,104,243,0.10))",
                          border: "1px solid var(--sc-line-active)",
                          boxShadow: "0 0 0 1px rgba(0,139,255,0.15), 0 6px 18px -10px rgba(0,139,255,0.6)",
                        }
                      : undefined
                  }
                >
                  {isActive && (
                    <span className="absolute inset-0 rounded-lg circuit-texture opacity-40 pointer-events-none" />
                  )}
                  <item.icon className={cn("w-[18px] h-[18px] shrink-0 relative z-10", isActive && "text-sc-blue")} />
                  <span className="relative z-10 flex-1">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-5 border-t border-panel-subtle shrink-0 flex flex-col items-center text-center gap-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(67,166,255,0.1)", border: "1px solid rgba(67,166,255,0.2)" }}>
            <Building2 className="w-5 h-5 text-sc-blue" />
          </div>
          <div className="text-[12px] font-semibold text-sc leading-tight truncate max-w-full">
            {meQuery.data?.name ?? "Your Account"}
          </div>
          <div className="text-[9px] text-sc-3 tracking-[0.16em] uppercase">Secure Customer Portal</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="h-[78px] shrink-0 flex items-center justify-between px-6 border-b border-panel"
          style={{ background: "var(--sc-panel)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {meQuery.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-sc-blue" />
            ) : (
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-sc leading-tight truncate" data-testid="text-portal-customer-name">
                  {meQuery.data?.name ?? "Customer Portal"}
                </div>
                {meQuery.data?.industry && (
                  <div className="text-xs text-sc-3 truncate">{meQuery.data.industry}</div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-sc leading-tight" data-testid="text-portal-user-name">
                {user?.name ?? "—"}
              </div>
              <div className="text-xs text-sc-3">{user?.email ?? ""}</div>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(67,166,255,0.12)", border: "1px solid rgba(67,166,255,0.25)" }}>
              <UserCircle className="w-5 h-5 text-sc-blue" />
            </div>
            <button
              onClick={handleLogout}
              data-testid="button-portal-logout"
              className="h-9 px-3 rounded-lg text-sm font-medium text-sc-2 hover:text-white transition-colors flex items-center gap-2"
              style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin" style={{ background: "var(--sc-bg)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
