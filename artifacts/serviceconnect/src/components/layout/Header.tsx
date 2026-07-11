import { useAppStore } from "@/lib/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Search, UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Header() {
  const { currentUser, users, setCurrentUserId, recommendations } = useAppStore();
  const urgentCount = recommendations.filter((r) => r.severity === "urgent").length;

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
      <div className="flex items-center flex-1 gap-6">
        <div className="relative w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            data-testid="input-global-search"
            placeholder="Search work orders, customers, or equipment..."
            className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-primary h-9 shadow-none text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Demo Role</span>
          <Select value={currentUser.id} onValueChange={setCurrentUserId}>
            <SelectTrigger data-testid="select-role" className="w-[230px] h-9 text-sm font-medium border-slate-200 bg-slate-50">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id} data-testid={`role-option-${user.id}`}>
                  {user.role} — {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-6 w-px bg-slate-200 mx-1" />

        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-900 h-9 w-9" data-testid="button-notifications">
          <Bell className="h-5 w-5" />
          {urgentCount > 0 && (
            <span className="absolute top-1.5 right-2 h-2 w-2 rounded-full bg-destructive border-2 border-white" />
          )}
        </Button>

        <div className="flex items-center gap-3 pl-1">
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-slate-900 leading-tight" data-testid="text-current-user">{currentUser.name}</span>
            <span className="text-xs text-slate-500 leading-tight">{currentUser.role}</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-100 border flex items-center justify-center text-slate-500">
            <UserCircle className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  );
}
