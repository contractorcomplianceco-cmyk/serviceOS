import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Role } from "@/lib/types";
import {
  ListFilter,
  Plus,
  Star,
  Play,
  Trash2,
  Pencil,
  Copy,
  X,
  Eye,
  ArrowUp,
  ArrowDown,
  Loader2,
  Save,
  Users,
  Lock,
  ShieldCheck,
} from "lucide-react";
import {
  useListSavedLists,
  useCreateSavedList,
  useUpdateSavedList,
  useDeleteSavedList,
  usePreviewSavedList,
  useRunSavedList,
  getListSavedListsQueryKey,
  SavedListFilterOp,
  type SavedList,
  type SavedListFilter,
  type SavedListInput,
  type SavedListRunResult,
} from "@workspace/api-client-react";

type Entity = SavedList["entity"];
type Visibility = SavedList["visibility"];
type FilterOp = SavedListFilter["op"];

const ROLES: Role[] = [
  "Administrator",
  "Service Manager",
  "Scheduler",
  "Supervisor",
  "Lead Technician",
  "Technician",
  "Billing",
  "Bookkeeper",
  "Inventory Manager",
  "Sales",
  "Subcontractor",
  "Customer Portal User",
];

interface FieldDef {
  field: string;
  label: string;
}

const ENTITY_META: Record<Entity, { label: string; fields: FieldDef[] }> = {
  "work-orders": {
    label: "Work Orders",
    fields: [
      { field: "number", label: "Number" },
      { field: "status", label: "Status" },
      { field: "priority", label: "Priority" },
      { field: "type", label: "Type" },
      { field: "region", label: "Region" },
      { field: "source", label: "Source" },
      { field: "billingStatus", label: "Billing status" },
      { field: "portalSyncStatus", label: "Portal status" },
      { field: "customerId", label: "Customer ID" },
      { field: "assignedTechnicianId", label: "Technician ID" },
      { field: "dueDate", label: "Due date" },
      { field: "description", label: "Description" },
    ],
  },
  customers: {
    label: "Customers",
    fields: [
      { field: "name", label: "Name" },
      { field: "industry", label: "Industry" },
      { field: "phone", label: "Phone" },
      { field: "email", label: "Email" },
      { field: "status", label: "Status" },
      { field: "balance", label: "Balance" },
      { field: "taxCode", label: "Tax code" },
    ],
  },
  invoices: {
    label: "Invoices",
    fields: [
      { field: "number", label: "Number" },
      { field: "status", label: "Status" },
      { field: "amount", label: "Amount" },
      { field: "amountPaid", label: "Amount paid" },
      { field: "dueDate", label: "Due date" },
      { field: "issueDate", label: "Issue date" },
      { field: "customerId", label: "Customer ID" },
    ],
  },
  inventory: {
    label: "Inventory",
    fields: [
      { field: "name", label: "Name" },
      { field: "category", label: "Category" },
      { field: "vendor", label: "Vendor" },
      { field: "location", label: "Location" },
      { field: "quantity", label: "Quantity" },
      { field: "reorderPoint", label: "Reorder point" },
      { field: "cost", label: "Cost" },
      { field: "billablePrice", label: "Billable price" },
    ],
  },
  equipment: {
    label: "Equipment",
    fields: [
      { field: "assetName", label: "Asset name" },
      { field: "manufacturer", label: "Manufacturer" },
      { field: "model", label: "Model" },
      { field: "serialNumber", label: "Serial number" },
      { field: "category", label: "Category" },
      { field: "condition", label: "Condition" },
      { field: "customerId", label: "Customer ID" },
    ],
  },
};

const ENTITY_ORDER: Entity[] = [
  "work-orders",
  "customers",
  "invoices",
  "inventory",
  "equipment",
];

const OPERATORS: { op: FilterOp; label: string; hasValue: boolean; kind: "text" | "number" | "list" }[] = [
  { op: SavedListFilterOp.eq, label: "equals", hasValue: true, kind: "text" },
  { op: SavedListFilterOp.neq, label: "not equals", hasValue: true, kind: "text" },
  { op: SavedListFilterOp.contains, label: "contains", hasValue: true, kind: "text" },
  { op: SavedListFilterOp.in, label: "is any of", hasValue: true, kind: "list" },
  { op: SavedListFilterOp.gt, label: "greater than", hasValue: true, kind: "number" },
  { op: SavedListFilterOp.lt, label: "less than", hasValue: true, kind: "number" },
  { op: SavedListFilterOp.gte, label: "≥", hasValue: true, kind: "number" },
  { op: SavedListFilterOp.lte, label: "≤", hasValue: true, kind: "number" },
  { op: SavedListFilterOp.is_empty, label: "is empty", hasValue: false, kind: "text" },
  { op: SavedListFilterOp.not_empty, label: "is not empty", hasValue: false, kind: "text" },
];

interface DraftFilter {
  field: string;
  op: FilterOp;
  value: string;
}

interface DraftState {
  name: string;
  entity: Entity;
  filters: DraftFilter[];
  search: string;
  sortField: string;
  sortDir: "asc" | "desc";
  visibility: Visibility;
  roleRestrictions: Role[];
}

function emptyDraft(): DraftState {
  return {
    name: "",
    entity: "work-orders",
    filters: [],
    search: "",
    sortField: "",
    sortDir: "asc",
    visibility: "private",
    roleRestrictions: [],
  };
}

function opMeta(op: FilterOp) {
  return OPERATORS.find((o) => o.op === op) ?? OPERATORS[0];
}

function filterValue(f: DraftFilter): SavedListFilter["value"] {
  const meta = opMeta(f.op);
  if (!meta.hasValue) return null;
  if (meta.kind === "list") {
    return f.value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  if (meta.kind === "number") {
    const n = Number(f.value);
    return Number.isNaN(n) ? f.value : n;
  }
  return f.value;
}

function draftToInput(d: DraftState): SavedListInput {
  const filters: SavedListFilter[] = d.filters
    .filter((f) => f.field)
    .map((f) => ({ field: f.field, op: f.op, value: filterValue(f) }));
  return {
    name: d.name.trim(),
    entity: d.entity,
    filters,
    search: d.search.trim() || null,
    sortField: d.sortField || null,
    sortDir: d.sortDir,
    visibility: d.visibility,
    roleRestrictions: d.visibility === "role" ? d.roleRestrictions : [],
  };
}

function listToDraft(l: SavedList): DraftState {
  return {
    name: l.name,
    entity: l.entity,
    filters: (l.filters ?? []).map((f) => ({
      field: f.field,
      op: f.op,
      value:
        f.value == null
          ? ""
          : Array.isArray(f.value)
            ? f.value.join(", ")
            : String(f.value),
    })),
    search: l.search ?? "",
    sortField: l.sortField ?? "",
    sortDir: l.sortDir === "desc" ? "desc" : "asc",
    visibility: l.visibility,
    roleRestrictions: (l.roleRestrictions ?? []) as Role[],
  };
}

function displayCell(v: unknown): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return `${v.length} item${v.length === 1 ? "" : "s"}`;
  if (typeof v === "object") return "…";
  return String(v);
}

function visibilityBadge(v: Visibility) {
  switch (v) {
    case "shared":
      return { label: "Shared", cls: "bg-blue-500/10 text-blue-600 border-blue-500/20", Icon: Users };
    case "role":
      return { label: "Role-restricted", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30", Icon: ShieldCheck };
    default:
      return { label: "Private", cls: "bg-slate-500/10 text-slate-500 border-slate-500/20", Icon: Lock };
  }
}

export default function SmartLists() {
  const { currentUser } = useAppStore();
  const { toast } = useToast();
  const qc = useQueryClient();

  const listsQuery = useListSavedLists();
  const createList = useCreateSavedList();
  const updateList = useUpdateSavedList();
  const deleteList = useDeleteSavedList();
  const previewList = usePreviewSavedList();
  const runList = useRunSavedList();

  const lists = listsQuery.data ?? [];

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getListSavedListsQueryKey() });

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(emptyDraft());
  const [preview, setPreview] = useState<SavedListRunResult | null>(null);

  const [runResult, setRunResult] = useState<SavedListRunResult | null>(null);
  const [runListId, setRunListId] = useState<string | null>(null);

  const patchDraft = (p: Partial<DraftState>) => {
    setDraft((prev) => ({ ...prev, ...p }));
    setPreview(null);
  };

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setPreview(null);
    setBuilderOpen(true);
  };

  const openEdit = (l: SavedList) => {
    setEditingId(l.id);
    setDraft(listToDraft(l));
    setPreview(null);
    setBuilderOpen(true);
  };

  const openDuplicate = (l: SavedList) => {
    setEditingId(null);
    setDraft({ ...listToDraft(l), name: `${l.name} (copy)`, visibility: "private", roleRestrictions: [] });
    setPreview(null);
    setBuilderOpen(true);
  };

  const addFilter = () => {
    const first = ENTITY_META[draft.entity].fields[0]?.field ?? "";
    patchDraft({
      filters: [...draft.filters, { field: first, op: SavedListFilterOp.eq, value: "" }],
    });
  };

  const updateFilter = (i: number, p: Partial<DraftFilter>) => {
    patchDraft({
      filters: draft.filters.map((f, idx) => (idx === i ? { ...f, ...p } : f)),
    });
  };

  const removeFilter = (i: number) => {
    patchDraft({ filters: draft.filters.filter((_, idx) => idx !== i) });
  };

  const toggleRole = (role: Role) => {
    const has = draft.roleRestrictions.includes(role);
    patchDraft({
      roleRestrictions: has
        ? draft.roleRestrictions.filter((r) => r !== role)
        : [...draft.roleRestrictions, role],
    });
  };

  const handlePreview = () => {
    previewList.mutate(
      { data: draftToInput(draft) },
      {
        onSuccess: (res) => setPreview(res),
        onError: () => toast({ title: "Preview failed", description: "Please try again." }),
      },
    );
  };

  const handleSave = () => {
    if (!draft.name.trim()) {
      toast({ title: "Name required", description: "Give your smart list a name." });
      return;
    }
    if (draft.visibility === "role" && draft.roleRestrictions.length === 0) {
      toast({ title: "Pick roles", description: "Select at least one role to restrict to." });
      return;
    }
    const data = draftToInput(draft);
    if (editingId) {
      updateList.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            toast({ title: "Smart list updated", description: `${data.name} saved.` });
            invalidate();
            setBuilderOpen(false);
          },
          onError: () => toast({ title: "Update failed", description: "Please try again." }),
        },
      );
    } else {
      createList.mutate(
        { data },
        {
          onSuccess: () => {
            toast({ title: "Smart list created", description: `${data.name} is ready.` });
            invalidate();
            setBuilderOpen(false);
          },
          onError: () => toast({ title: "Create failed", description: "Please try again." }),
        },
      );
    }
  };

  const handleRun = (l: SavedList) => {
    setRunListId(l.id);
    runList.mutate(
      { id: l.id },
      {
        onSuccess: (res) => {
          setRunResult(res);
          setRunListId(l.id);
        },
        onError: () => {
          toast({ title: "Run failed", description: "Please try again." });
          setRunListId(null);
        },
      },
    );
  };

  const handleDelete = (l: SavedList) => {
    deleteList.mutate(
      { id: l.id },
      {
        onSuccess: () => {
          toast({ title: "Smart list deleted", description: `${l.name} removed.` });
          invalidate();
          if (runListId === l.id) {
            setRunResult(null);
            setRunListId(null);
          }
        },
        onError: () => toast({ title: "Delete failed", description: "You may not own this list." }),
      },
    );
  };

  const toggleFavorite = (l: SavedList) => {
    updateList.mutate(
      { id: l.id, data: { favorite: !l.favorite } },
      {
        onSuccess: () => invalidate(),
        onError: () => toast({ title: "Update failed", description: "You may not own this list." }),
      },
    );
  };

  const reorder = (l: SavedList, dir: -1 | 1) => {
    const sorted = [...lists].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((x) => x.id === l.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    updateList.mutate(
      { id: l.id, data: { sortOrder: other.sortOrder } },
      {
        onSuccess: () => {
          updateList.mutate(
            { id: other.id, data: { sortOrder: l.sortOrder } },
            { onSuccess: () => invalidate(), onError: () => invalidate() },
          );
        },
        onError: () => toast({ title: "Reorder failed", description: "You may not own this list." }),
      },
    );
  };

  const ordered = useMemo(() => {
    return [...lists].sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
  }, [lists]);

  const favorites = ordered.filter((l) => l.favorite);
  const others = ordered.filter((l) => !l.favorite);

  const canEdit = (l: SavedList) =>
    l.ownerUserId === currentUser.id || currentUser.role === "Administrator";

  const runColumns = useMemo(() => {
    if (!runResult || runResult.items.length === 0) return [] as FieldDef[];
    const meta = ENTITY_META[runResult.entity as Entity];
    if (!meta) return [];
    const first = runResult.items[0];
    return meta.fields.filter((f) => f.field in first).slice(0, 6);
  }, [runResult]);

  const runListName = lists.find((l) => l.id === runListId)?.name ?? "";

  const renderCard = (l: SavedList) => {
    const vb = visibilityBadge(l.visibility);
    const editable = canEdit(l);
    return (
      <Card key={l.id} className="sc-panel border-none" data-testid={`saved-list-${l.id}`}>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-sc-blue shrink-0" />
                <span className="font-semibold text-sc truncate">{l.name}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                  {ENTITY_META[l.entity]?.label ?? l.entity}
                </Badge>
                <Badge variant="outline" className={vb.cls}>
                  <vb.Icon className="w-3 h-3 mr-1" /> {vb.label}
                </Badge>
                {l.filters.length > 0 && (
                  <span className="text-xs text-sc-3">
                    {l.filters.length} filter{l.filters.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => toggleFavorite(l)}
              disabled={!editable}
              className="shrink-0 disabled:opacity-40"
              data-testid={`button-favorite-${l.id}`}
              title={editable ? "Toggle favorite" : "Only the owner can edit"}
            >
              <Star
                className={`w-5 h-5 ${l.favorite ? "text-amber-400 fill-amber-400" : "text-sc-3"}`}
              />
            </button>
          </div>

          {l.search && (
            <p className="text-xs text-sc-3">
              Search: <span className="text-sc-2">"{l.search}"</span>
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: "var(--sc-line)" }}>
            <Button
              size="sm"
              className="text-white"
              style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }}
              onClick={() => handleRun(l)}
              disabled={runList.isPending && runListId === l.id}
              data-testid={`button-run-list-${l.id}`}
            >
              {runList.isPending && runListId === l.id ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 mr-1.5" />
              )}
              Run
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-panel text-sc-2"
              onClick={() => openDuplicate(l)}
              data-testid={`button-duplicate-list-${l.id}`}
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Duplicate
            </Button>
            {editable && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-panel text-sc-2"
                  onClick={() => openEdit(l)}
                  data-testid={`button-edit-list-${l.id}`}
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-panel text-sc-2 px-2"
                  onClick={() => reorder(l, -1)}
                  disabled={updateList.isPending}
                  data-testid={`button-moveup-list-${l.id}`}
                  title="Move up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-panel text-sc-2 px-2"
                  onClick={() => reorder(l, 1)}
                  disabled={updateList.isPending}
                  data-testid={`button-movedown-list-${l.id}`}
                  title="Move down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/30 text-destructive"
                  onClick={() => handleDelete(l)}
                  disabled={deleteList.isPending}
                  data-testid={`button-delete-list-${l.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div
      className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500"
      data-testid="page-smart-lists"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-sc" data-testid="text-page-title">
            Smart Lists
          </h1>
          <p className="text-sc-2 mt-1 text-sm">
            Saved, shareable queries across your live operational data.
          </p>
        </div>
        <Button
          className="text-white blue-glow-soft shrink-0"
          style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }}
          onClick={openCreate}
          data-testid="button-create-list"
        >
          <Plus className="w-4 h-4 mr-2" /> New Smart List
        </Button>
      </div>

      {listsQuery.isLoading ? (
        <div className="flex items-center justify-center py-16" data-testid="lists-loading">
          <Loader2 className="w-6 h-6 text-sc-blue animate-spin" />
        </div>
      ) : listsQuery.isError ? (
        <Card className="sc-panel border-none">
          <CardContent className="py-16 text-center text-sc-2" data-testid="lists-error">
            Unable to load smart lists. Please try again.
          </CardContent>
        </Card>
      ) : ordered.length === 0 ? (
        <Card className="sc-panel border-none">
          <CardContent className="py-16 text-center text-sc-3" data-testid="empty-lists">
            No smart lists yet. Create your first saved query to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {favorites.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-sc">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Favorites
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {favorites.map(renderCard)}
              </div>
            </div>
          )}
          {others.length > 0 && (
            <div className="space-y-3">
              {favorites.length > 0 && (
                <div className="text-sm font-semibold text-sc">All Lists</div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {others.map(renderCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {runResult && (
        <Card className="sc-panel border-none" data-testid="run-result">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-sc-blue" />
                <span className="font-semibold text-sc">Results — {runListName}</span>
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20" data-testid="text-run-count">
                  {runResult.count} row{runResult.count === 1 ? "" : "s"}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-panel text-sc-2"
                onClick={() => {
                  setRunResult(null);
                  setRunListId(null);
                }}
                data-testid="button-close-results"
              >
                <X className="w-3.5 h-3.5 mr-1.5" /> Close
              </Button>
            </div>
            {runResult.items.length === 0 ? (
              <div className="py-10 text-center text-sm text-sc-3">No rows matched this list.</div>
            ) : (
              <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--sc-line)" }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {runColumns.map((c) => (
                        <TableHead key={c.field} className="text-sc-3">{c.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runResult.items.map((item, i) => (
                      <TableRow key={(item.id as string) ?? i} data-testid={`run-row-${i}`}>
                        {runColumns.map((c) => (
                          <TableCell key={c.field} className="text-sc-2">
                            {displayCell(item[c.field])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="max-w-2xl bg-card border-panel text-sc max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-panel pb-4">
            <DialogTitle className="text-lg text-sc flex items-center gap-2">
              <ListFilter className="w-4 h-4 text-sc-blue" />
              {editingId ? "Edit Smart List" : "New Smart List"}
            </DialogTitle>
            <DialogDescription className="text-sc-3">
              Build a saved query with filters, search, and sharing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sc-2">List name</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => patchDraft({ name: e.target.value })}
                  placeholder="Past-due invoices"
                  className="bg-elevated border-panel text-sc"
                  data-testid="input-list-name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sc-2">Entity</Label>
                <Select
                  value={draft.entity}
                  onValueChange={(v) =>
                    patchDraft({ entity: v as Entity, filters: [], sortField: "" })
                  }
                >
                  <SelectTrigger className="bg-elevated border-panel text-sc" data-testid="select-list-entity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_ORDER.map((e) => (
                      <SelectItem key={e} value={e}>
                        {ENTITY_META[e].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sc-2">Filters</Label>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-panel text-sc-2"
                  onClick={addFilter}
                  data-testid="button-add-filter"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add filter
                </Button>
              </div>
              {draft.filters.length === 0 && (
                <p className="text-xs text-sc-3">No filters — the list will return all records.</p>
              )}
              <div className="space-y-2">
                {draft.filters.map((f, i) => {
                  const meta = opMeta(f.op);
                  return (
                    <div
                      key={i}
                      className="flex flex-wrap items-center gap-2 rounded-lg p-2"
                      style={{ background: "var(--sc-inner)", border: "1px solid var(--sc-line)" }}
                      data-testid={`filter-row-${i}`}
                    >
                      <Select value={f.field} onValueChange={(v) => updateFilter(i, { field: v })}>
                        <SelectTrigger
                          className="bg-elevated border-panel text-sc w-[150px]"
                          data-testid={`select-filter-field-${i}`}
                        >
                          <SelectValue placeholder="Field" />
                        </SelectTrigger>
                        <SelectContent>
                          {ENTITY_META[draft.entity].fields.map((fd) => (
                            <SelectItem key={fd.field} value={fd.field}>
                              {fd.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={f.op}
                        onValueChange={(v) => updateFilter(i, { op: v as FilterOp })}
                      >
                        <SelectTrigger
                          className="bg-elevated border-panel text-sc w-[140px]"
                          data-testid={`select-filter-op-${i}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map((o) => (
                            <SelectItem key={o.op} value={o.op}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {meta.hasValue && (
                        <Input
                          value={f.value}
                          onChange={(e) => updateFilter(i, { value: e.target.value })}
                          placeholder={meta.kind === "list" ? "a, b, c" : "value"}
                          type={meta.kind === "number" ? "number" : "text"}
                          className="bg-elevated border-panel text-sc flex-1 min-w-[120px]"
                          data-testid={`input-filter-value-${i}`}
                        />
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive px-2"
                        onClick={() => removeFilter(i)}
                        data-testid={`button-remove-filter-${i}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2 md:col-span-1">
                <Label className="text-sc-2">Search text</Label>
                <Input
                  value={draft.search}
                  onChange={(e) => patchDraft({ search: e.target.value })}
                  placeholder="Free text…"
                  className="bg-elevated border-panel text-sc"
                  data-testid="input-list-search"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sc-2">Sort field</Label>
                <Select
                  value={draft.sortField || "__none__"}
                  onValueChange={(v) => patchDraft({ sortField: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger className="bg-elevated border-panel text-sc" data-testid="select-list-sort-field">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {ENTITY_META[draft.entity].fields.map((fd) => (
                      <SelectItem key={fd.field} value={fd.field}>
                        {fd.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sc-2">Direction</Label>
                <Select
                  value={draft.sortDir}
                  onValueChange={(v) => patchDraft({ sortDir: v as "asc" | "desc" })}
                >
                  <SelectTrigger className="bg-elevated border-panel text-sc" data-testid="select-list-sort-dir">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sc-2">Visibility</Label>
              <Select
                value={draft.visibility}
                onValueChange={(v) => patchDraft({ visibility: v as Visibility })}
              >
                <SelectTrigger className="bg-elevated border-panel text-sc" data-testid="select-list-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private (only me)</SelectItem>
                  <SelectItem value="shared">Shared (everyone)</SelectItem>
                  <SelectItem value="role">Role-restricted</SelectItem>
                </SelectContent>
              </Select>
              {draft.visibility === "role" && (
                <div
                  className="grid grid-cols-2 gap-2 rounded-lg p-3 mt-2"
                  style={{ background: "var(--sc-inner)", border: "1px solid var(--sc-line)" }}
                >
                  {ROLES.map((role) => (
                    <label
                      key={role}
                      className="flex items-center gap-2 text-sm text-sc-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={draft.roleRestrictions.includes(role)}
                        onCheckedChange={() => toggleRole(role)}
                        data-testid={`checkbox-role-${role.replace(/\s+/g, "-").toLowerCase()}`}
                      />
                      {role}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div
              className="rounded-lg p-3 flex items-center justify-between gap-3"
              style={{ background: "var(--sc-inner)", border: "1px solid var(--sc-line)" }}
            >
              <div className="flex items-center gap-2 text-sm text-sc-2">
                <Eye className="w-4 h-4 text-sc-blue" />
                {preview ? (
                  <span data-testid="text-preview-count">
                    {preview.count} matching row{preview.count === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span className="text-sc-3">Preview to see matching rows</span>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-panel text-sc-2"
                onClick={handlePreview}
                disabled={previewList.isPending}
                data-testid="button-preview-list"
              >
                {previewList.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                )}
                Preview
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="border-panel text-sc-2"
              onClick={() => setBuilderOpen(false)}
              data-testid="button-cancel-list"
            >
              Cancel
            </Button>
            <Button
              className="text-white"
              style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }}
              onClick={handleSave}
              disabled={createList.isPending || updateList.isPending}
              data-testid="button-save-list"
            >
              <Save className="w-4 h-4 mr-2" />
              {editingId ? "Save Changes" : "Create List"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
