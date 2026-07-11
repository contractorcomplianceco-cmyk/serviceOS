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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { canAccess, canApproveCloseouts, NavKey } from "@/lib/permissions";

const navItems: { name: string; path: string; key: NavKey; icon: typeof LayoutDashboard }[] = [
  { name: "Today", path: "/today", key: "today", icon: LayoutDashboard },
  { name: "Intake Queue", path: "/intake", key: "intake", icon: Inbox },
  { name: "Work Orders", path: "/work-orders", key: "work-orders", icon: ClipboardList },
  { name: "Dispatch", path: "/dispatch", key: "dispatch", icon: Calendar },
  { name: "Technicians", path: "/technicians", key: "technicians", icon: Wrench },
  { name: "Customers", path: "/customers", key: "customers", icon: Users },
  { name: "Locations", path: "/locations", key: "locations", icon: MapPin },
  { name: "Inventory", path: "/inventory", key: "inventory", icon: Package },
  { name: "Equipment", path: "/equipment", key: "equipment", icon: HardHat },
  { name: "Billing", path: "/billing", key: "billing", icon: CreditCard },
  { name: "Accounting", path: "/accounting", key: "accounting", icon: Calculator },
  { name: "Documents", path: "/documents", key: "documents", icon: FileText },
  { name: "Reports", path: "/reports", key: "reports", icon: BarChart3 },
  { name: "Intelligence", path: "/intelligence", key: "intelligence", icon: Sparkles },
  { name: "Settings", path: "/settings", key: "settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { currentUser } = useAppStore();
  const visible: { name: string; path: string; key: string; icon: typeof LayoutDashboard }[] = navItems.filter((item) => canAccess(currentUser.role, item.key));
  if (canApproveCloseouts(currentUser.role)) {
    visible.push({ name: "Supervisor Review", path: "/review", key: "review", icon: ClipboardCheck });
  }

  return (
    <div className="w-64 flex-shrink-0 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border shadow-xl z-10">
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border bg-sidebar gap-3">
        <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center text-white font-bold text-sm shadow-lg">
          SC
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-tight">ServiceConnect</span>
          <span className="text-[10px] text-blue-400 font-medium tracking-wide">RoseOS Intelligence</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5" data-testid="nav-sidebar">
        {visible.map((item) => {
          const isActive = location === item.path || location.startsWith(item.path + "/");
          return (
            <Link key={item.path} href={item.path}>
              <div
                data-testid={`nav-${item.key}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/20">
        <div className="text-xs text-sidebar-foreground/50 text-center font-medium">RoseOS Build 2.1.0</div>
      </div>
    </div>
  );
}
