import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAppStore } from "@/lib/store";
import { useAuth, IS_DEV } from "@/lib/auth";
import { useGlobalSearch, getGlobalSearchQueryKey, type SearchResult } from "@workspace/api-client-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Mail, MessageSquare, UserCircle, Wrench, Building2, HardHat, FileText, Package, LogOut, Loader2 } from "lucide-react";
import { NotificationCenter } from "./NotificationCenter";

const ENTITY_META: Record<string, { label: string; icon: typeof Wrench }> = {
  "work-order": { label: "Work Orders", icon: Wrench },
  customer: { label: "Customers", icon: Building2 },
  invoice: { label: "Invoices", icon: FileText },
  inventory: { label: "Inventory", icon: Package },
  equipment: { label: "Equipment", icon: HardHat },
};

interface SearchGroup {
  key: string;
  label: string;
  icon: typeof Wrench;
  results: SearchResult[];
}

export function Header() {
  const { currentUser, users, setCurrentUserId } = useAppStore();
  const { logout } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Debounce the query so we don't hit the backend on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 220);
    return () => clearTimeout(t);
  }, [query]);

  const searchQuery = useGlobalSearch(
    { q: debounced },
    {
      query: {
        queryKey: getGlobalSearchQueryKey({ q: debounced }),
        enabled: debounced.length > 0,
        staleTime: 10_000,
      },
    },
  );

  const groups = useMemo<SearchGroup[]>(() => {
    const results = searchQuery.data?.results ?? [];
    if (results.length === 0) return [];
    const byEntity = new Map<string, SearchResult[]>();
    for (const r of results) {
      const arr = byEntity.get(r.entity) ?? [];
      arr.push(r);
      byEntity.set(r.entity, arr);
    }
    return [...byEntity.entries()].map(([key, res]) => ({
      key,
      label: ENTITY_META[key]?.label ?? key,
      icon: ENTITY_META[key]?.icon ?? FileText,
      results: res,
    }));
  }, [searchQuery.data]);

  const totalResults = groups.reduce((n, g) => n + g.results.length, 0);
  const isSearching = searchQuery.isFetching && debounced.length > 0;

  const go = (route: string) => {
    navigate(route);
    setOpen(false);
    setQuery("");
  };

  return (
    <header
      className="h-[78px] border-b border-panel flex items-center gap-5 px-6 shrink-0 z-20"
      style={{ background: "var(--sc-bg-deep)" }}
    >
      {/* Search */}
      <div className="relative flex-1 max-w-[570px]" ref={containerRef}>
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sc-3" />
        <input
          data-testid="input-global-search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query && setOpen(true)}
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

        {open && query.trim() && (
          <div
            className="absolute left-0 right-0 top-[calc(100%+8px)] max-h-[420px] overflow-y-auto scrollbar-thin rounded-xl shadow-2xl z-30 py-2"
            style={{ background: "var(--sc-panel-2)", border: "1px solid var(--sc-line)" }}
            data-testid="global-search-results"
          >
            {isSearching && totalResults === 0 ? (
              <div className="px-4 py-6 flex items-center justify-center gap-2 text-sm text-sc-3" data-testid="text-search-loading">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching…
              </div>
            ) : totalResults === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-sc-3" data-testid="text-search-empty">
                No results for “{query}”
              </div>
            ) : (
              groups.map((g) => (
                <div key={g.key} className="mb-1 last:mb-0">
                  <div className="flex items-center gap-2 px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sc-3">
                    <g.icon className="w-3 h-3" /> {g.label}
                  </div>
                  {g.results.map((r) => (
                    <button
                      key={`${r.entity}-${r.id}`}
                      onClick={() => go(r.url)}
                      data-testid={`button-search-result-${r.entity}-${r.id}`}
                      className="w-full text-left px-4 py-2 hover:bg-white/[0.05] transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-sc truncate">{r.title}</span>
                        <span className="text-xs text-sc-3 truncate">{r.subtitle}</span>
                      </div>
                      {r.badge && (
                        <span className="text-[10px] shrink-0 px-2 py-0.5 rounded-md text-sc-2" style={{ background: "var(--sc-inner)", border: "1px solid var(--sc-line)" }}>{r.badge}</span>
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 ml-auto">
        {/* Dev-only role selector — hidden in production builds. */}
        {IS_DEV && (
          <>
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
          </>
        )}

        {/* Icon actions */}
        <div className="flex items-center gap-1.5">
          <NotificationCenter />
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
          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sc-2 hover:text-white hover:bg-white/[0.05] transition-colors ml-1"
            data-testid="button-logout"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
