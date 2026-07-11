import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  useListRecommendations,
  useGenerateRecommendations,
  useApproveRecommendation,
  useRejectRecommendation,
  useResolveRecommendation,
  useEditRecommendation,
  useSnoozeRecommendation,
  useAssignRecommendation,
  getListRecommendationsQueryKey,
  type Recommendation,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { canManageRecommendations } from "@/lib/permissions";
import { Sparkles, ShieldCheck, Check, X, ArrowRight, Edit2, RefreshCw, Clock, CheckCircle2, Loader2 } from "lucide-react";

const STATUS_TABS = ["Open", "Snoozed", "Resolved", "Rejected"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const severityStyle: Record<string, string> = {
  urgent: "text-[color:var(--sc-red)] border-[color:var(--sc-red)] bg-[rgba(255,51,72,0.1)]",
  warning: "text-[color:var(--sc-orange)] border-[color:var(--sc-orange)] bg-[rgba(255,157,24,0.1)]",
  info: "text-sc-blue border-[color:var(--sc-line-strong)] bg-transparent",
};

// Route an approved recommendation to the entity it concerns, where trivial.
function routeFor(r: Recommendation): string | null {
  const id = r.relatedEntityId;
  switch (r.relatedEntityType) {
    case "work-order":
      return id ? `/work-orders/${id}` : "/dispatch";
    case "invoice":
      return "/billing";
    case "customer":
      return id ? `/customers/${id}` : "/customers";
    case "inventory":
      return "/inventory";
    case "document":
      return "/documents";
    default:
      return id?.startsWith("wo") ? `/work-orders/${id}` : null;
  }
}

export default function Intelligence() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { currentUser, users } = useAppStore();
  const canManage = canManageRecommendations(currentUser.role);
  const [tab, setTab] = useState<StatusTab>("Open");
  const [editing, setEditing] = useState<Recommendation | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const listQuery = useListRecommendations({ status: tab });
  const recommendations = listQuery.data ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: getListRecommendationsQueryKey() });

  const generate = useGenerateRecommendations({ mutation: { onSuccess: invalidate } });
  const approve = useApproveRecommendation({ mutation: { onSuccess: invalidate } });
  const reject = useRejectRecommendation({ mutation: { onSuccess: invalidate } });
  const resolve = useResolveRecommendation({ mutation: { onSuccess: invalidate } });
  const edit = useEditRecommendation({ mutation: { onSuccess: invalidate } });
  const snooze = useSnoozeRecommendation({ mutation: { onSuccess: invalidate } });
  const assign = useAssignRecommendation({ mutation: { onSuccess: invalidate } });

  const handleGenerate = async () => {
    const res = await generate.mutateAsync();
    toast({ title: "Recommendations refreshed", description: `${res.created} new · ${res.updated} updated · ${res.resolved} auto-resolved.` });
  };

  const handleApprove = async (r: Recommendation) => {
    await approve.mutateAsync({ id: r.id });
    const dest = routeFor(r);
    if (dest) { navigate(dest); return; }
    toast({ title: `${r.suggestedAction} drafted`, description: `Approved "${r.title}". Nothing was scheduled, sent, or invoiced automatically — review to finalize.` });
  };

  const handleReject = async (r: Recommendation) => {
    await reject.mutateAsync({ id: r.id });
    toast({ title: "Dismissed", description: `"${r.title}" was rejected.` });
  };

  const handleResolve = async (r: Recommendation) => {
    await resolve.mutateAsync({ id: r.id });
    toast({ title: "Resolved", description: `"${r.title}" marked resolved.` });
  };

  const handleSnooze = async (r: Recommendation) => {
    const until = new Date(Date.now() + 7 * 86_400_000).toISOString();
    await snooze.mutateAsync({ id: r.id, data: { snoozeUntil: until } });
    toast({ title: "Snoozed", description: `"${r.title}" hidden for 7 days.` });
  };

  const handleAssign = async (r: Recommendation, userId: string) => {
    const assignedToUserId = userId === "__unassigned__" ? null : userId;
    await assign.mutateAsync({ id: r.id, data: { assignedToUserId } });
    const name = users.find((u) => u.id === assignedToUserId)?.name;
    toast({
      title: assignedToUserId ? "Assigned" : "Unassigned",
      description: assignedToUserId ? `"${r.title}" assigned to ${name ?? "user"}.` : `"${r.title}" is now unassigned.`,
    });
  };

  const openEdit = (r: Recommendation) => {
    setEditing(r);
    setEditTitle(r.editedTitle ?? r.title);
    setEditDesc(r.editedDescription ?? r.description);
  };

  const saveEdit = async () => {
    if (!editing) return;
    await edit.mutateAsync({ id: editing.id, data: { title: editTitle.trim(), description: editDesc.trim() } });
    setEditing(null);
    toast({ title: "Recommendation edited", description: "Your revised wording was saved." });
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center relative overflow-hidden" style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }}>
          <div className="absolute inset-0 bg-[rgba(67,166,255,0.2)] blur-xl"></div>
          <Sparkles className="w-7 h-7 text-sc-blue relative z-10" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">RoseOS Intelligence</h1>
          <p className="text-sc-2 mt-1 text-sm">Data-derived recommendations across the business. You approve every action.</p>
        </div>
        {canManage && (
          <Button
            onClick={handleGenerate}
            disabled={generate.isPending}
            className="text-white blue-glow-soft"
            style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }}
            data-testid="button-generate-recommendations"
          >
            {generate.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Refresh
          </Button>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-xl p-5 text-sm text-sc-3 shadow-lg relative overflow-hidden" style={{ background: "var(--sc-inner)", border: "1px solid var(--sc-line)" }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-[rgba(67,166,255,0.1)] rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0 text-sc-blue relative z-10" />
        <div className="relative z-10 leading-relaxed"><span className="font-semibold text-sc">Guardrail:</span> RoseOS never schedules, sends, or invoices on its own. Every suggestion below is a draft awaiting your human decision. Nothing happens without your explicit approval.</div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-2">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            data-testid={`tab-${s.toLowerCase()}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${tab === s ? "bg-[var(--sc-elevated)] text-white border-panel-strong" : "bg-transparent text-sc-2 hover:text-white border-transparent hover:border-panel"}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {listQuery.isLoading ? (
          <div className="py-16 flex justify-center" data-testid="recommendations-loading"><Loader2 className="w-6 h-6 text-sc-blue animate-spin" /></div>
        ) : recommendations.length === 0 ? (
          <Card className="sc-panel border-0">
            <CardContent className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[rgba(56,212,119,0.1)] flex items-center justify-center">
                <Check className="w-8 h-8 text-[color:var(--sc-green)]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-sc">Nothing here</h3>
                <p className="text-sc-3 max-w-md mx-auto mt-1 text-sm">No {tab.toLowerCase()} recommendations right now.</p>
              </div>
            </CardContent>
          </Card>
        ) : recommendations.map((r) => (
          <Card key={r.id} className="border-0 shadow-xl overflow-hidden group circuit-texture relative" style={{ background: "var(--sc-panel)" }} data-testid={`rec-${r.id}`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[rgba(67,166,255,0.05)] rounded-full blur-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="p-6 relative z-10">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-sc-blue border-[color:var(--sc-line-strong)] text-[10px] uppercase font-mono tracking-wider bg-transparent">{r.confidence}% Confidence</Badge>
                    <Badge variant="outline" className={`text-[10px] uppercase tracking-wide ${severityStyle[r.severity] ?? severityStyle.info}`}>{r.severity}</Badge>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-sc-3 border-panel-strong bg-transparent">{r.type}</Badge>
                    {r.assignedToUserId && (
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-sc-blue border-[color:var(--sc-line-strong)] bg-transparent" data-testid={`badge-assignee-${r.id}`}>
                        Assigned: {users.find((u) => u.id === r.assignedToUserId)?.name ?? "Unknown"}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-sc mb-2">{r.editedTitle ?? r.title}</h3>
                  <p className="text-sc-2 text-sm leading-relaxed max-w-3xl">{r.editedDescription ?? r.description}</p>
                  <p className="text-sc-3 text-xs mt-3 leading-relaxed max-w-3xl"><span className="font-semibold text-sc-2">Why:</span> {r.reason}</p>
                  {r.evidence.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {r.evidence.map((e, i) => (
                        <span key={i} className="text-[11px] px-2 py-1 rounded-md text-sc-2" style={{ background: "var(--sc-inner)", border: "1px solid var(--sc-line)" }}>
                          <span className="text-sc-3">{e.label}:</span> {e.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 shrink-0 md:w-48">
                  {canManage && tab === "Open" && (
                    <>
                      <Button className="text-white blue-glow-soft justify-start" style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }} onClick={() => handleApprove(r)} data-testid={`button-accept-${r.id}`}>
                        <Check className="w-4 h-4 mr-2" /> {r.suggestedAction}
                      </Button>
                      <Button variant="outline" className="bg-transparent text-sc-2 hover:text-white justify-start" style={{ border: "1px solid var(--sc-line)" }} onClick={() => openEdit(r)} data-testid={`button-edit-${r.id}`}>
                        <Edit2 className="w-4 h-4 mr-2" /> Edit
                      </Button>
                      <Button variant="outline" className="bg-transparent text-sc-2 hover:text-white justify-start" style={{ border: "1px solid var(--sc-line)" }} onClick={() => handleSnooze(r)} data-testid={`button-snooze-${r.id}`}>
                        <Clock className="w-4 h-4 mr-2" /> Snooze 7d
                      </Button>
                      <Button variant="outline" className="bg-transparent text-sc-2 hover:text-white justify-start" style={{ border: "1px solid var(--sc-line)" }} onClick={() => handleReject(r)} data-testid={`button-dismiss-${r.id}`}>
                        <X className="w-4 h-4 mr-2" /> Reject
                      </Button>
                    </>
                  )}
                  {canManage && (tab === "Snoozed" || tab === "Rejected") && (
                    <Button className="text-white blue-glow-soft justify-start" style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }} onClick={() => handleApprove(r)} data-testid={`button-accept-${r.id}`}>
                      <Check className="w-4 h-4 mr-2" /> {r.suggestedAction}
                    </Button>
                  )}
                  {canManage && tab !== "Resolved" && (
                    <Button variant="ghost" className="text-[color:var(--sc-green)] hover:bg-white/[0.04] justify-start" onClick={() => handleResolve(r)} data-testid={`button-resolve-${r.id}`}>
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Resolve
                    </Button>
                  )}
                  {canManage && tab !== "Resolved" && tab !== "Rejected" && (
                    <Select value={r.assignedToUserId ?? "__unassigned__"} onValueChange={(v) => handleAssign(r, v)}>
                      <SelectTrigger className="bg-transparent text-sc-2 justify-start" style={{ border: "1px solid var(--sc-line)" }} data-testid={`select-assignee-${r.id}`}>
                        <SelectValue placeholder="Assign to…" />
                      </SelectTrigger>
                      <SelectContent className="text-sc" style={{ background: "var(--sc-panel-2)", border: "1px solid var(--sc-line)" }}>
                        <SelectItem value="__unassigned__">Unassigned</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id} data-testid={`assignee-option-${r.id}-${u.id}`}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {routeFor(r) && (
                    <Button variant="ghost" className="text-sc-blue hover:bg-white/[0.04] justify-start" onClick={() => navigate(routeFor(r)!)} data-testid={`button-view-${r.id}`}>
                      View <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sc-panel border-panel" data-testid="dialog-edit-recommendation">
          <DialogHeader>
            <DialogTitle className="text-sc">Edit recommendation</DialogTitle>
            <DialogDescription className="text-sc-3">Revise the wording before you act on it. The underlying evidence is unchanged.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sc-2">Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} data-testid="input-edit-rec-title" />
            </div>
            <div className="space-y-2">
              <Label className="text-sc-2">Description</Label>
              <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={4} data-testid="input-edit-rec-desc" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="bg-transparent text-sc-2" onClick={() => setEditing(null)}>Cancel</Button>
            <Button className="text-white" style={{ background: "var(--sc-btn)" }} onClick={saveEdit} disabled={!editTitle.trim() || !editDesc.trim() || edit.isPending} data-testid="button-save-rec-edit">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
