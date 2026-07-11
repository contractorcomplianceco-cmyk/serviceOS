import { useAppStore } from "@/lib/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Search, Mail, MessageSquare, UserCircle } from "lucide-react";

export function Header() {
  const { currentUser, users, setCurrentUserId, recommendations } = useAppStore();
  const urgentCount = recommendations.filter((r) => r.severity === "urgent").length;

  return (
    <header
      className="h-[78px] border-b border-panel flex items-center gap-5 px-6 shrink-0 z-10"
      style={{ background: "var(--sc-bg-deep)" }}
    >
      {/* Search */}
      <div className="relative flex-1 max-w-[570px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sc-3" />
        <input
          data-testid="input-global-search"
          placeholder="Search work orders, customers, equipment, documents..."
          className="w-full h-11 pl-10 pr-16 rounded-lg text-sm text-sc placeholder:text-sc-3 focus:outline-none focus:ring-1 focus:ring-[var(--sc-line-active)] transition-shadow"
          style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}
        />
        <kbd
          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 h-6 rounded-md text-[11px] font-medium text-sc-3"
          style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}
        >
          ⌘ K
        </kbd>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        {/* Role selector */}
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] text-sc-3 font-semibold uppercase tracking-[0.14em] leading-tight text-right">
            Demo<br />Role
          </span>
          <Select value={currentUser.id} onValueChange={setCurrentUserId}>
            <SelectTrigger
              data-testid="select-role"
              className="w-[230px] h-11 text-sm font-medium text-sc rounded-lg"
              style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}
            >
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent
              className="text-sc"
              style={{ background: "var(--sc-panel-2)", border: "1px solid var(--sc-line)" }}
            >
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id} data-testid={`role-option-${user.id}`}>
                  {user.role} — {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-8 w-px" style={{ background: "var(--sc-line)" }} />

        {/* Icon actions */}
        <div className="flex items-center gap-1.5">
          <button
            className="relative w-9 h-9 rounded-lg flex items-center justify-center text-sc-2 hover:text-white hover:bg-white/[0.05] transition-colors"
            data-testid="button-notifications"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            {urgentCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full"
                style={{ background: "var(--sc-red)", boxShadow: "0 0 0 2px var(--sc-bg-deep)" }}
              />
            )}
          </button>
          <button
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sc-2 hover:text-white hover:bg-white/[0.05] transition-colors"
            data-testid="button-mail"
            aria-label="Mail"
          >
            <Mail className="h-[18px] w-[18px]" />
          </button>
          <button
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sc-2 hover:text-white hover:bg-white/[0.05] transition-colors"
            data-testid="button-messages"
            aria-label="Messages"
          >
            <MessageSquare className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="h-8 w-px" style={{ background: "var(--sc-line)" }} />

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sc-2" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}>
            <UserCircle className="w-5 h-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-sc" data-testid="text-current-user">{currentUser.name}</span>
            <span className="text-xs text-sc-3">{currentUser.role}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
