import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListIntegrationConnections,
  useListIntegrationEvents,
  useSimulateIntegrationInbound,
  useUpdateIntegrationConnection,
  useApproveIntegrationEvent,
  useRetryIntegrationEvent,
  useRejectIntegrationEvent,
  getListIntegrationConnectionsQueryKey,
  getListIntegrationEventsQueryKey,
  IntegrationConnectionUpdateState,
  type IntegrationConnection,
  type IntegrationEvent,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { canManageIntegrations } from "@/lib/permissions";
import { shortDate } from "@/lib/ui";
import {
  Plug,
  PlayCircle,
  ShieldCheck,
  RefreshCw,
  XCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Info,
} from "lucide-react";

const GREEN = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
const BLUE = "bg-blue-500/10 text-blue-400 border-blue-500/20";
const AMBER = "bg-amber-500/10 text-amber-400 border-amber-500/30";
const RED = "bg-destructive/10 text-destructive border-destructive/20";
const SLATE = "bg-white/[0.04] text-sc-2 border-[var(--sc-line)]";

function stateClass(state: string): string {
  switch (state) {
    case "Connected":
      return GREEN;
    case "Sandbox":
      return BLUE;
    case "Simulated":
    case "ConfigurationRequired":
      return AMBER;
    case "Error":
      return RED;
    default:
      return SLATE;
  }
}

function eventStatusClass(status: string): string {
  switch (status) {
    case "Applied":
    case "Processed":
    case "Sent":
    case "Delivered":
      return GREEN;
    case "PendingApproval":
    case "Pending":
    case "Queued":
      return AMBER;
    case "Failed":
    case "Rejected":
      return RED;
    default:
      return SLATE;
  }
}

const STATE_OPTIONS = Object.values(IntegrationConnectionUpdateState);

function timeLabel(iso?: string | null): string {
  if (!iso) return "—";
  return `${shortDate(iso)} ${new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function configStr(
  config: Record<string, unknown> | undefined,
  key: string,
): string {
  const v = config?.[key];
  return typeof v === "string" ? v : "";
}

export default function Integrations() {
  const { currentUser, customers, locations } = useAppStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canManage = canManageIntegrations(currentUser.role);

  const connectionsKey = getListIntegrationConnectionsQueryKey();
  const { data: connectionsData } = useListIntegrationConnections({
    query: { queryKey: connectionsKey },
  });
  const connections = (connectionsData ?? []) as IntegrationConnection[];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = connections.find((c) => c.id === selectedId) ?? connections[0] ?? null;
  const activeId = selected?.id ?? "";

  const eventsKey = getListIntegrationEventsQueryKey(activeId);
  const { data: eventsData } = useListIntegrationEvents(activeId, {
    query: { queryKey: eventsKey, enabled: !!activeId },
  });
  const events = (eventsData ?? []) as IntegrationEvent[];

  const invalidateConnections = () => void qc.invalidateQueries({ queryKey: connectionsKey });
  const invalidateEvents = () => {
    if (activeId) void qc.invalidateQueries({ queryKey: getListIntegrationEventsQueryKey(activeId) });
  };
  const invalidateAll = () => {
    invalidateConnections();
    invalidateEvents();
  };

  const simulate = useSimulateIntegrationInbound({
    mutation: {
      onSuccess: () => {
        invalidateAll();
        toast({ title: "Inbound simulated", description: "A sandbox event was queued for review." });
      },
      onError: () => toast({ title: "Simulation failed", description: "Could not simulate an inbound event." }),
    },
  });
  const updateConnection = useUpdateIntegrationConnection({
    mutation: {
      onSuccess: () => {
        invalidateConnections();
        toast({ title: "Connection updated" });
      },
      onError: () => toast({ title: "Update failed", description: "Could not update the connection." }),
    },
  });
  const approveEvent = useApproveIntegrationEvent({ mutation: { onSuccess: invalidateAll } });
  const retryEvent = useRetryIntegrationEvent({ mutation: { onSuccess: invalidateAll } });
  const rejectEvent = useRejectIntegrationEvent({ mutation: { onSuccess: invalidateAll } });

  const pendingCount = events.filter((e) => e.status === "PendingApproval").length;

  return (
    <div className="p-6 space-y-6" data-testid="page-integrations">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-sc-blue"
            style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}
          >
            <Plug className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-sc" data-testid="text-integrations-title">Integrations</h1>
            <p className="text-sm text-sc-3 mt-0.5">
              Adapters for ServiceChannel, email intake, portals, VoiceConnect &amp; routing.
            </p>
          </div>
        </div>
      </div>

      <div
        className="flex items-start gap-2.5 rounded-lg px-4 py-3 text-[13px]"
        style={{ background: "rgba(18,104,243,0.06)", border: "1px solid var(--sc-line)" }}
        data-testid="integrations-simulation-banner"
      >
        <Info className="w-4 h-4 text-sc-blue shrink-0 mt-0.5" />
        <span className="text-sc-2">
          All connections run in <span className="font-semibold text-sc">simulation / sandbox</span> mode. No live
          traffic is sent. Inbound events and outbound sends are drafts that a person approves before anything is
          applied.
        </span>
      </div>

      {connections.length === 0 ? (
        <Card style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}>
          <CardContent className="py-12 text-center text-sm text-sc-3" data-testid="integrations-empty">
            No integration connections configured.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
          {/* Connection list */}
          <div className="space-y-2.5" data-testid="integration-connection-list">
            {connections.map((c) => {
              const isActive = c.id === activeId;
              return (
                <button
                  key={c.id}
                  data-testid={`integration-connection-${c.id}`}
                  onClick={() => setSelectedId(c.id)}
                  className="w-full text-left rounded-xl px-4 py-3.5 transition-colors"
                  style={{
                    background: isActive ? "rgba(18,104,243,0.08)" : "var(--sc-panel)",
                    border: `1px solid ${isActive ? "var(--sc-line-active)" : "var(--sc-line)"}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-sc truncate">{c.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 ${stateClass(c.state)}`}>
                      {c.state}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-sc-3">{c.provider}</span>
                    <span className="text-[11px] text-sc-3">·</span>
                    <span className="text-[11px] text-sc-3">{c.environment}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail */}
          {selected && (
            <Card style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}>
              <CardContent className="p-5 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-sc" data-testid="text-connection-name">{selected.name}</h2>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${stateClass(selected.state)}`}>
                        {selected.state}
                      </span>
                    </div>
                    <p className="text-[13px] text-sc-3 mt-1">
                      {selected.provider} · {selected.environment}
                      {selected.tokenHint ? ` · ${selected.tokenHint}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="button-simulate-inbound"
                    disabled={!canManage || simulate.isPending}
                    onClick={() => simulate.mutate({ id: selected.id })}
                    className="gap-1.5"
                  >
                    <PlayCircle className="w-4 h-4" /> Simulate inbound
                  </Button>
                </div>

                {/* Meta grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}>
                    <div className="text-[10px] uppercase tracking-wider text-sc-3 flex items-center gap-1">
                      <ArrowDownToLine className="w-3 h-3" /> Last inbound
                    </div>
                    <div className="text-[13px] text-sc mt-1">{timeLabel(selected.lastInboundAt)}</div>
                  </div>
                  <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}>
                    <div className="text-[10px] uppercase tracking-wider text-sc-3 flex items-center gap-1">
                      <ArrowUpFromLine className="w-3 h-3" /> Last outbound
                    </div>
                    <div className="text-[13px] text-sc mt-1">{timeLabel(selected.lastOutboundAt)}</div>
                  </div>
                  <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}>
                    <div className="text-[10px] uppercase tracking-wider text-sc-3">Pending approvals</div>
                    <div className="text-[13px] text-sc mt-1" data-testid="text-pending-count">{pendingCount}</div>
                  </div>
                </div>

                {selected.lastError && (
                  <div className="rounded-lg px-3 py-2.5 text-[12px] text-destructive" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }} data-testid="text-connection-error">
                    {selected.lastError}
                  </div>
                )}

                {/* State control */}
                {canManage && (
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-sc-3">Connection state</span>
                    <Select
                      value={selected.state}
                      onValueChange={(v) =>
                        updateConnection.mutate({
                          id: selected.id,
                          data: { state: v as IntegrationConnectionUpdateState },
                        })
                      }
                    >
                      <SelectTrigger
                        data-testid="select-connection-state"
                        className="w-[220px] h-9 text-sm text-sc"
                        style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ background: "var(--sc-panel-2)", border: "1px solid var(--sc-line)" }} className="text-sc">
                        {STATE_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s} data-testid={`state-option-${s}`}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Inbound mapping config */}
                {canManage && (
                  <div
                    className="rounded-lg p-4 space-y-3"
                    style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}
                    data-testid="mapping-config"
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-sc">Inbound mapping</h3>
                      <p className="text-[12px] text-sc-3 mt-0.5">
                        Where inbound messages land. Applied events become Draft intakes for this
                        customer/location — a person still triages every one.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-sc-3">Default customer</label>
                        <Select
                          value={configStr(selected.config, "defaultCustomerId") || "none"}
                          onValueChange={(v) =>
                            updateConnection.mutate({
                              id: selected.id,
                              data: {
                                config: {
                                  ...selected.config,
                                  defaultCustomerId: v === "none" ? "" : v,
                                },
                              },
                            })
                          }
                        >
                          <SelectTrigger
                            data-testid="select-default-customer"
                            className="h-9 text-sm text-sc"
                            style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}
                          >
                            <SelectValue placeholder="Not mapped" />
                          </SelectTrigger>
                          <SelectContent style={{ background: "var(--sc-panel-2)", border: "1px solid var(--sc-line)" }} className="text-sc">
                            <SelectItem value="none" data-testid="customer-option-none">Not mapped</SelectItem>
                            {customers.map((c) => (
                              <SelectItem key={c.id} value={c.id} data-testid={`customer-option-${c.id}`}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-sc-3">Default location</label>
                        <Select
                          value={configStr(selected.config, "defaultLocationId") || "none"}
                          onValueChange={(v) =>
                            updateConnection.mutate({
                              id: selected.id,
                              data: {
                                config: {
                                  ...selected.config,
                                  defaultLocationId: v === "none" ? "" : v,
                                },
                              },
                            })
                          }
                        >
                          <SelectTrigger
                            data-testid="select-default-location"
                            className="h-9 text-sm text-sc"
                            style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}
                          >
                            <SelectValue placeholder="Not mapped" />
                          </SelectTrigger>
                          <SelectContent style={{ background: "var(--sc-panel-2)", border: "1px solid var(--sc-line)" }} className="text-sc">
                            <SelectItem value="none" data-testid="location-option-none">Not mapped</SelectItem>
                            {locations
                              .filter((l) => {
                                const cust = configStr(selected.config, "defaultCustomerId");
                                return !cust || l.customerId === cust;
                              })
                              .map((l) => (
                                <SelectItem key={l.id} value={l.id} data-testid={`location-option-${l.id}`}>
                                  {l.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {!configStr(selected.config, "defaultCustomerId") && (
                      <div className="text-[11px] text-amber-400">
                        No customer mapping — inbound events will fail until a default customer is set.
                      </div>
                    )}
                  </div>
                )}

                {/* Events / approval queue */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-sc">Sync history &amp; approval queue</h3>
                    <span className="text-[11px] text-sc-3">{events.length} events</span>
                  </div>
                  <div className="space-y-2" data-testid="integration-events">
                    {events.length === 0 ? (
                      <div className="text-[13px] text-sc-3 py-6 text-center" data-testid="events-empty">
                        No events yet. Simulate an inbound message to see the flow.
                      </div>
                    ) : (
                      events.map((e) => (
                        <div
                          key={e.id}
                          data-testid={`integration-event-${e.id}`}
                          className="rounded-lg px-3.5 py-3"
                          style={{ background: "var(--sc-elevated)", border: "1px solid var(--sc-line)" }}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-sc-3">
                              {e.direction === "Inbound" ? <ArrowDownToLine className="w-3 h-3" /> : <ArrowUpFromLine className="w-3 h-3" />}
                              {e.direction}
                            </span>
                            <span className="text-[13px] font-medium text-sc">{e.eventType}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${eventStatusClass(e.status)}`}>
                              {e.status}
                            </span>
                            <span className="text-[11px] text-sc-3 ml-auto">{timeLabel(e.createdAt)}</span>
                          </div>
                          {(e.entityType || e.externalId) && (
                            <div className="text-[11px] text-sc-3 mt-1">
                              {e.entityType ? `${e.entityType}${e.entityId ? ` · ${e.entityId}` : ""}` : ""}
                              {e.externalId ? `${e.entityType ? " · " : ""}ext: ${e.externalId}` : ""}
                            </div>
                          )}
                          {e.lastError && (
                            <div className="text-[11px] text-destructive mt-1">{e.lastError}</div>
                          )}
                          {canManage && (e.status === "PendingApproval" || e.status === "Failed") && (
                            <div className="flex items-center gap-3 mt-2.5">
                              {e.status === "PendingApproval" && (
                                <>
                                  <button
                                    className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
                                    data-testid={`button-approve-event-${e.id}`}
                                    disabled={approveEvent.isPending}
                                    onClick={() => approveEvent.mutate({ id: e.id })}
                                  >
                                    <ShieldCheck className="w-3 h-3" /> Approve
                                  </button>
                                  <button
                                    className="flex items-center gap-1 text-[11px] font-medium text-destructive hover:text-red-400 disabled:opacity-40"
                                    data-testid={`button-reject-event-${e.id}`}
                                    disabled={rejectEvent.isPending}
                                    onClick={() => rejectEvent.mutate({ id: e.id })}
                                  >
                                    <XCircle className="w-3 h-3" /> Reject
                                  </button>
                                </>
                              )}
                              {e.status === "Failed" && (
                                <button
                                  className="flex items-center gap-1 text-[11px] font-medium text-sc-blue hover:text-white disabled:opacity-40"
                                  data-testid={`button-retry-event-${e.id}`}
                                  disabled={retryEvent.isPending}
                                  onClick={() => retryEvent.mutate({ id: e.id })}
                                >
                                  <RefreshCw className="w-3 h-3" /> Retry
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
