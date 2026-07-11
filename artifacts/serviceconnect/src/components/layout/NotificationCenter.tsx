import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useRetryNotification,
  useApproveNotification,
  getListNotificationsQueryKey,
  type Notification,
} from "@workspace/api-client-react";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  CheckCheck,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

const CHANNEL_META: Record<string, { label: string; icon: typeof Bell }> = {
  InApp: { label: "In-App", icon: Bell },
  Email: { label: "Email", icon: Mail },
  SMS: { label: "SMS", icon: MessageSquare },
  Push: { label: "Push", icon: Smartphone },
};

const GREEN = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
const AMBER = "bg-amber-500/10 text-amber-400 border-amber-500/30";
const RED = "bg-destructive/10 text-destructive border-destructive/20";
const SLATE = "bg-white/[0.04] text-sc-2 border-[var(--sc-line)]";

function statusClass(status: string): string {
  switch (status) {
    case "Sent":
    case "Delivered":
      return GREEN;
    case "PendingApproval":
    case "Queued":
    case "Sending":
      return AMBER;
    case "Failed":
      return RED;
    default:
      return SLATE;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const notificationsKey = getListNotificationsQueryKey();

  const { data } = useListNotifications({
    query: { queryKey: notificationsKey, refetchInterval: 30000 },
  });
  const notifications = (data ?? []) as Notification[];
  const unread = notifications.filter((n) => !n.readAt).length;

  const invalidate = () => void qc.invalidateQueries({ queryKey: notificationsKey });
  const markRead = useMarkNotificationRead({ mutation: { onSuccess: invalidate } });
  const markAll = useMarkAllNotificationsRead({ mutation: { onSuccess: invalidate } });
  const retry = useRetryNotification({ mutation: { onSuccess: invalidate } });
  const approve = useApproveNotification({ mutation: { onSuccess: invalidate } });

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-sc-2 hover:text-white hover:bg-white/[0.05] transition-colors"
        data-testid="button-notifications"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ background: "var(--sc-red)", boxShadow: "0 0 0 2px var(--sc-bg-deep)" }}
            data-testid="badge-notification-count"
          >
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] w-[420px] max-h-[520px] overflow-hidden flex flex-col rounded-xl shadow-2xl z-40"
          style={{ background: "var(--sc-panel-2)", border: "1px solid var(--sc-line)" }}
          data-testid="notification-center"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--sc-line)" }}>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-sc">Notifications</span>
              <span className="text-[11px] text-sc-3">{unread} unread · simulated delivery</span>
            </div>
            <button
              className="flex items-center gap-1.5 text-[12px] font-medium text-sc-2 hover:text-white disabled:opacity-40 transition-colors"
              data-testid="button-mark-all-read"
              disabled={unread === 0 || markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          </div>

          <div className="overflow-y-auto scrollbar-thin flex-1">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-sc-3" data-testid="notifications-empty">
                You're all caught up.
              </div>
            ) : (
              notifications.map((n) => {
                const meta = CHANNEL_META[n.channel] ?? { label: n.channel, icon: Bell };
                const Icon = meta.icon;
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    data-testid={`notification-${n.id}`}
                    className="px-4 py-3 border-b last:border-b-0 hover:bg-white/[0.02] transition-colors"
                    style={{ borderColor: "var(--sc-line)", background: isUnread ? "rgba(18,104,243,0.05)" : undefined }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-sc-2"
                        style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-sc-3">{meta.label}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusClass(n.status)}`}>
                            {n.status}
                          </span>
                          {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-sc-blue" />}
                        </div>
                        {n.subject && <div className="text-sm font-medium text-sc mt-1 truncate">{n.subject}</div>}
                        <div className="text-[13px] text-sc-2 mt-0.5 line-clamp-2">{n.body}</div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[11px] text-sc-3">{timeAgo(n.createdAt)}</span>
                          {n.requiresApproval && n.status === "PendingApproval" && (
                            <button
                              className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
                              data-testid={`button-approve-notification-${n.id}`}
                              disabled={approve.isPending}
                              onClick={() => approve.mutate({ id: n.id })}
                            >
                              <ShieldCheck className="w-3 h-3" /> Approve &amp; send
                            </button>
                          )}
                          {n.status === "Failed" && (
                            <button
                              className="flex items-center gap-1 text-[11px] font-medium text-sc-blue hover:text-white disabled:opacity-40"
                              data-testid={`button-retry-notification-${n.id}`}
                              disabled={retry.isPending}
                              onClick={() => retry.mutate({ id: n.id })}
                            >
                              <RefreshCw className="w-3 h-3" /> Retry
                            </button>
                          )}
                          {isUnread && (
                            <button
                              className="text-[11px] font-medium text-sc-2 hover:text-white disabled:opacity-40 ml-auto"
                              data-testid={`button-mark-read-${n.id}`}
                              disabled={markRead.isPending}
                              onClick={() => markRead.mutate({ id: n.id })}
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                        {n.lastError && n.status === "Failed" && (
                          <div className="text-[11px] text-destructive mt-1.5 truncate">{n.lastError}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
