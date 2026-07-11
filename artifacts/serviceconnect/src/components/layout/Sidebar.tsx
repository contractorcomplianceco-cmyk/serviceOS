import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Inbox,
  ClipboardList,
  Calendar,
  Wrench,
  Users,
  MapPin,
  Package,
  HardHat,
  CreditCard,
  Calculator,
  FileText,
  BarChart3,
  Sparkles,
  Settings,
  ClipboardCheck,
  FileSignature,
  Repeat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { canAccess, canApproveCloseouts, NavKey } from "@/lib/permissions";
import logoIcon from "@/assets/logo-icon.png";

const navItems: { name: string; path: string; key: NavKey; icon: typeof LayoutDashboard; testId?: string }[] = [
  { name: "Today", path: "/today", key: "today", icon: LayoutDashboard },
  { name: "Intake Queue", path: "/intake", key: "intake", icon: Inbox },
  { name: "Work Orders", path: "/work-orders", key: "work-orders", icon: ClipboardList },
  { name: "Dispatch", path: "/dispatch", key: "dispatch", icon: Calendar },
  { name: "Technicians", path: "/technicians", key: "technicians", icon: Wrench },
  { name: "Customers", path: "/customers", key: "customers", icon: Users },
  { name: "Locations", path: "/locations", key: "locations", icon: MapPin },
  { name: "Inventory", path: "/inventory", key: "inventory", icon: Package },
  { name: "Equipment", path: "/equipment", key: "equipment", icon: HardHat },
  { name: "Contracts", path: "/contracts", key: "contracts", icon: FileSignature, testId: "contracts" },
  { name: "Recurring", path: "/recurrence", key: "contracts", icon: Repeat, testId: "recurrence" },
  { name: "Billing", path: "/billing", key: "billing", icon: CreditCard },
  { name: "Accounting", path: "/accounting", key: "accounting", icon: Calculator },
  { name: "Documents", path: "/documents", key: "documents", icon: FileText },
  { name: "Reports", path: "/reports", key: "reports", icon: BarChart3 },
  { name: "Intelligence", path: "/intelligence", key: "intelligence", icon: Sparkles },
  { name: "Settings", path: "/settings", key: "settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { currentUser, intake } = useAppStore();
  const visible: { name: string; path: string; key: string; icon: typeof LayoutDashboard; testId?: string }[] =
    navItems.filter((item) => canAccess(currentUser.role, item.key));
  if (canApproveCloseouts(currentUser.role)) {
    visible.push({ name: "Supervisor Review", path: "/review", key: "review", icon: ClipboardCheck });
  }

  const counts: Record<string, number> = { intake: intake.length };

  return (
    <aside
      className="w-[264px] flex-shrink-0 flex flex-col z-20 border-r border-panel"
      style={{ background: "var(--sidebar)" }}
    >
      {/* Logo lockup */}
      <div className="h-[78px] flex items-center gap-3 px-5 border-b border-panel-subtle shrink-0">
        <img
          src={logoIcon}
          alt="ServiceConnect"
          className="w-14 h-14 rounded-lg object-cover shrink-0 ring-1 ring-white/10"
        />
        <div className="flex flex-col leading-none">
          <span className="text-[17px] font-semibold tracking-tight text-sc">ServiceConnect</span>
          <span className="text-[9px] mt-1 text-sc-3 font-medium tracking-[0.18em] uppercase">
            With RoseOS Intelligence
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-0.5" data-testid="nav-sidebar">
        {visible.map((item) => {
          const isActive = location === item.path || location.startsWith(item.path + "/");
          const count = counts[item.key];
          return (
            <Link key={item.path} href={item.path}>
              <div
                data-testid={`nav-${item.testId ?? item.key}`}
                className={cn(
                  "relative flex items-center gap-3 h-[44px] px-3.5 rounded-lg text-sm font-medium transition-all cursor-pointer group",
                  isActive
                    ? "text-white"
                    : "text-sc-2 hover:text-white hover:bg-white/[0.04]"
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
                {count ? (
                  <span
                    className="relative z-10 min-w-[22px] h-[20px] px-1.5 flex items-center justify-center rounded-md text-[11px] font-semibold text-sc-2"
                    style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}
                    data-testid={`nav-count-${item.key}`}
                  >
                    {count}
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer — RoseOS orb */}
      <div className="px-5 py-6 border-t border-panel-subtle shrink-0 flex flex-col items-center text-center">
        <div className="relative w-16 h-16 mb-3">
          <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 50% 45%, rgba(67,166,255,0.55), rgba(18,104,243,0.15) 55%, transparent 72%)" }} />
          <div className="absolute inset-[6px] rounded-full border border-[rgba(67,166,255,0.35)]" />
          <div className="absolute inset-[13px] rounded-full border border-[rgba(67,166,255,0.25)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-sc-blue" />
          </div>
        </div>
        <div className="text-[13px] font-semibold text-sc tracking-wide">RoseOS Intelligence</div>
        <div className="text-[9px] text-sc-3 tracking-[0.16em] uppercase mt-1">AI-Powered Operations</div>
        <div className="text-[9px] text-sc-blue/70 tracking-[0.16em] uppercase mt-0.5">Predict. Prevent. Perform.</div>
      </div>
    </aside>
  );
}
