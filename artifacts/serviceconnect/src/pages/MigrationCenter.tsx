import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { shortDate } from "@/lib/ui";
import {
  Database,
  Plus,
  Upload,
  CheckCircle2,
  PlayCircle,
  Undo2,
  Trash2,
  Download,
  Save,
  FileSpreadsheet,
  Loader2,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  Layers,
} from "lucide-react";
import {
  useListMigrationEntities,
  useListMigrationBatches,
  useListMigrationRows,
  useListMigrationTemplates,
  useCreateMigrationBatch,
  useDeleteMigrationBatch,
  useUpdateMigrationMapping,
  useValidateMigrationBatch,
  useImportMigrationBatch,
  useRollbackMigrationBatch,
  useCreateMigrationTemplate,
  useExportMigrationFailedRows,
  getListMigrationBatchesQueryKey,
  getListMigrationRowsQueryKey,
  getListMigrationTemplatesQueryKey,
  getExportMigrationFailedRowsQueryKey,
  type MigrationBatch,
  type MigrationColumnMap,
  type MigrationRow,
  type CreateMigrationBatchInputEntity,
  type CreateMigrationTemplateInputEntity,
} from "@workspace/api-client-react";

const GREEN = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
const BLUE = "bg-blue-500/10 text-blue-600 border-blue-500/20";
const AMBER = "bg-amber-500/10 text-amber-600 border-amber-500/30";
const RED = "bg-destructive/10 text-destructive border-destructive/20";
const SLATE = "bg-slate-500/10 text-slate-400 border-slate-500/20";

const NONE = "__none__";

function batchStatusClass(status: string): string {
  switch (status) {
    case "Imported":
      return GREEN;
    case "Validated":
      return BLUE;
    case "Importing":
      return AMBER;
    case "Failed":
      return RED;
    case "RolledBack":
      return SLATE;
    default:
      return SLATE;
  }
}

function rowStatusClass(status: string): string {
  switch (status) {
    case "Valid":
    case "Imported":
      return GREEN;
    case "Error":
    case "Failed":
      return RED;
    case "Duplicate":
      return AMBER;
    case "RolledBack":
      return SLATE;
    default:
      return SLATE;
  }
}

function downloadCsv(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function MigrationCenter() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const entitiesQuery = useListMigrationEntities();
  const batchesQuery = useListMigrationBatches();
  const templatesQuery = useListMigrationTemplates();

  const entities = entitiesQuery.data ?? [];
  const batches = batchesQuery.data ?? [];
  const templates = templatesQuery.data ?? [];

  const createBatch = useCreateMigrationBatch();
  const deleteBatch = useDeleteMigrationBatch();
  const updateMapping = useUpdateMigrationMapping();
  const validateBatch = useValidateMigrationBatch();
  const importBatch = useImportMigrationBatch();
  const rollbackBatch = useRollbackMigrationBatch();
  const createTemplate = useCreateMigrationTemplate();

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const selectedBatch: MigrationBatch | undefined = useMemo(
    () => batches.find((b) => b.id === selectedBatchId),
    [batches, selectedBatchId],
  );
  const entitySpec = useMemo(
    () => entities.find((e) => e.entity === selectedBatch?.entity),
    [entities, selectedBatch],
  );

  // Keep a selection once batches load.
  useEffect(() => {
    if (!selectedBatchId && batches.length > 0) {
      setSelectedBatchId(batches[0].id);
    }
  }, [batches, selectedBatchId]);

  const rowsQuery = useListMigrationRows(selectedBatchId ?? "", {
    query: {
      enabled: !!selectedBatchId,
      queryKey: getListMigrationRowsQueryKey(selectedBatchId ?? ""),
    },
  });
  const rows: MigrationRow[] = rowsQuery.data ?? [];

  const failedRowsQuery = useExportMigrationFailedRows(selectedBatchId ?? "", {
    query: {
      enabled: false,
      queryKey: getExportMigrationFailedRowsQueryKey(selectedBatchId ?? ""),
    },
  });

  const invalidateBatches = () =>
    qc.invalidateQueries({ queryKey: getListMigrationBatchesQueryKey() });
  const invalidateRows = () => {
    if (selectedBatchId)
      qc.invalidateQueries({ queryKey: getListMigrationRowsQueryKey(selectedBatchId) });
  };
  const invalidateTemplates = () =>
    qc.invalidateQueries({ queryKey: getListMigrationTemplatesQueryKey() });

  // ---- Mapping draft -------------------------------------------------------
  const [mappingDraft, setMappingDraft] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!selectedBatch) {
      setMappingDraft({});
      return;
    }
    const next: Record<string, string> = {};
    for (const cm of selectedBatch.mapping) next[cm.target] = cm.source ?? NONE;
    setMappingDraft(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatch?.id, selectedBatch?.updatedAt]);

  const buildMapping = (): MigrationColumnMap[] =>
    (entitySpec?.fields ?? []).map((f) => {
      const v = mappingDraft[f.target];
      return { target: f.target, source: v && v !== NONE ? v : null };
    });

  const mappingLocked = selectedBatch?.status === "Imported";

  const handleSaveMapping = () => {
    if (!selectedBatch) return;
    updateMapping.mutate(
      { id: selectedBatch.id, data: { mapping: buildMapping() } },
      {
        onSuccess: () => {
          toast({ title: "Mapping saved", description: "Column mapping updated. Re-validate to check the rows." });
          invalidateBatches();
          invalidateRows();
        },
        onError: (e) => toast({ title: "Could not save mapping", description: String(e), variant: "destructive" }),
      },
    );
  };

  const handleValidate = () => {
    if (!selectedBatch) return;
    validateBatch.mutate(
      { id: selectedBatch.id },
      {
        onSuccess: (b) => {
          toast({
            title: "Validation complete",
            description: `${b.summary?.validRows ?? 0} valid · ${b.summary?.errorRows ?? 0} errors · ${b.summary?.duplicateRows ?? 0} duplicates.`,
          });
          invalidateBatches();
          invalidateRows();
        },
        onError: (e) => toast({ title: "Validation failed", description: String(e), variant: "destructive" }),
      },
    );
  };

  const handleImport = () => {
    if (!selectedBatch) return;
    importBatch.mutate(
      { id: selectedBatch.id },
      {
        onSuccess: (b) => {
          toast({
            title: "Import complete",
            description: `${b.summary?.importedRows ?? 0} rows imported · ${b.summary?.failedRows ?? 0} failed.`,
          });
          invalidateBatches();
          invalidateRows();
        },
        onError: (e) => toast({ title: "Import failed", description: String(e), variant: "destructive" }),
      },
    );
  };

  const handleRollback = () => {
    if (!selectedBatch) return;
    rollbackBatch.mutate(
      { id: selectedBatch.id },
      {
        onSuccess: () => {
          toast({ title: "Batch rolled back", description: "Imported records were removed where safe." });
          invalidateBatches();
          invalidateRows();
        },
        onError: (e) => toast({ title: "Rollback failed", description: String(e), variant: "destructive" }),
      },
    );
  };

  const handleDelete = () => {
    if (!selectedBatch) return;
    const id = selectedBatch.id;
    deleteBatch.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Batch deleted", description: "The migration batch and its rows were removed." });
          setSelectedBatchId(null);
          invalidateBatches();
        },
        onError: (e) => toast({ title: "Delete failed", description: String(e), variant: "destructive" }),
      },
    );
  };

  const handleExportFailed = async () => {
    if (!selectedBatch) return;
    try {
      const res = await failedRowsQuery.refetch();
      if (res.data) {
        downloadCsv(`failed-rows-${selectedBatch.id}.csv`, res.data as string);
        toast({ title: "Export ready", description: "Failed-row report downloaded." });
      } else {
        toast({ title: "Nothing to export", description: "No failed rows were found." });
      }
    } catch (e) {
      toast({ title: "Export failed", description: String(e), variant: "destructive" });
    }
  };

  // ---- Create batch dialog -------------------------------------------------
  const [createOpen, setCreateOpen] = useState(false);
  const [cEntity, setCEntity] = useState("");
  const [cFileName, setCFileName] = useState("");
  const [cCsv, setCCsv] = useState("");

  const resetCreate = () => {
    setCEntity("");
    setCFileName("");
    setCCsv("");
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setCCsv(text);
    if (!cFileName) setCFileName(file.name);
  };

  const handleCreate = () => {
    if (!cEntity || !cFileName.trim() || !cCsv.trim()) {
      toast({ title: "Missing information", description: "Entity, file name, and CSV content are required." });
      return;
    }
    createBatch.mutate(
      {
        data: {
          entity: cEntity as CreateMigrationBatchInputEntity,
          fileName: cFileName.trim(),
          csv: cCsv,
        },
      },
      {
        onSuccess: (b) => {
          toast({ title: "Batch created", description: `"${b.fileName}" uploaded with an auto-guessed mapping.` });
          invalidateBatches();
          setSelectedBatchId(b.id);
          setCreateOpen(false);
          resetCreate();
        },
        onError: (e) => toast({ title: "Could not create batch", description: String(e), variant: "destructive" }),
      },
    );
  };

  // ---- Save-as-template dialog ---------------------------------------------
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const handleSaveTemplate = () => {
    if (!selectedBatch || !templateName.trim()) {
      toast({ title: "Name required", description: "Give the mapping template a name." });
      return;
    }
    createTemplate.mutate(
      {
        data: {
          name: templateName.trim(),
          entity: selectedBatch.entity as CreateMigrationTemplateInputEntity,
          mapping: buildMapping(),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Template saved", description: `"${templateName.trim()}" can now be reused.` });
          invalidateTemplates();
          setTemplateOpen(false);
          setTemplateName("");
        },
        onError: (e) => toast({ title: "Could not save template", description: String(e), variant: "destructive" }),
      },
    );
  };

  const applicableTemplates = useMemo(
    () => templates.filter((t) => t.entity === selectedBatch?.entity),
    [templates, selectedBatch],
  );

  const applyTemplate = (templateId: string) => {
    const tpl = applicableTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    const next: Record<string, string> = { ...mappingDraft };
    for (const f of entitySpec?.fields ?? []) {
      const cm = tpl.mapping.find((m) => m.target === f.target);
      next[f.target] = cm?.source ?? NONE;
    }
    setMappingDraft(next);
    toast({ title: "Template applied", description: `Loaded "${tpl.name}" — review then Save mapping.` });
  };

  const summary = selectedBatch?.summary;
  const busy =
    validateBatch.isPending || importBatch.isPending || rollbackBatch.isPending || updateMapping.isPending;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500" data-testid="page-migration-center">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-sc flex items-center gap-2" data-testid="text-page-title">
            <Database className="w-7 h-7 text-sc-blue" /> Data Migration Center
          </h1>
          <p className="text-sc-2 mt-1 text-sm max-w-2xl">
            Guided, CSV-based controlled migration from BlueFolder. This is not a live BlueFolder API integration —
            you export CSV files from BlueFolder, map columns to ServiceConnect fields, validate, then import with a
            full audit trail and safe rollback.
          </p>
        </div>
        <Button
          className="text-white blue-glow-soft shrink-0"
          style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }}
          onClick={() => setCreateOpen(true)}
          data-testid="button-new-batch"
        >
          <Plus className="w-4 h-4 mr-2" /> New Batch
        </Button>
      </div>

      <div className="flex items-start gap-3 rounded-xl p-4 text-xs text-sc-3" style={{ background: "var(--sc-inner)", border: "1px solid var(--sc-line)" }} data-testid="text-migration-disclaimer">
        <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-sc-orange" />
        <span className="leading-relaxed">
          Migration is destructive and admin-only. Every batch defaults to a dry-run validation pass. Source IDs from
          BlueFolder are preserved so records can be de-duplicated and rolled back.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batch list */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-sc uppercase tracking-wide">Batches</h2>
            <Button
              size="sm"
              variant="outline"
              className="border-panel text-sc-2 h-8"
              onClick={() => invalidateBatches()}
              data-testid="button-refresh-batches"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
          {batchesQuery.isLoading ? (
            <div className="py-12 text-center text-sm text-sc-3" data-testid="text-batches-loading">
              <Loader2 className="w-5 h-5 text-sc-blue animate-spin mx-auto" />
            </div>
          ) : batchesQuery.isError ? (
            <div className="py-12 text-center text-sm text-destructive" data-testid="text-batches-error">
              Unable to load batches.
            </div>
          ) : batches.length === 0 ? (
            <Card className="bg-card border-panel">
              <CardContent className="py-12 text-center text-sm text-sc-3" data-testid="empty-batches">
                No migration batches yet. Upload a BlueFolder CSV export to begin.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {batches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBatchId(b.id)}
                  className={`w-full text-left rounded-lg p-3 border transition-colors ${
                    selectedBatchId === b.id
                      ? "border-panel-strong"
                      : "border-transparent hover:border-panel hover:bg-white/[0.04]"
                  }`}
                  style={{ background: selectedBatchId === b.id ? "var(--sc-elevated)" : "var(--sc-panel)" }}
                  data-testid={`migration-batch-${b.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileSpreadsheet className="w-4 h-4 text-sc-blue shrink-0" />
                      <span className="text-sm font-medium text-sc truncate">{b.fileName}</span>
                    </div>
                    <Badge variant="outline" className={batchStatusClass(b.status)}>{b.status}</Badge>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-sc-3">
                    <span className="capitalize">{b.entity}</span>
                    <span>·</span>
                    <span>{b.summary?.totalRows ?? 0} rows</span>
                    <span>·</span>
                    <span>{shortDate(b.createdAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Batch detail */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedBatch ? (
            <Card className="bg-card border-panel">
              <CardContent className="py-20 text-center text-sm text-sc-3" data-testid="empty-batch-detail">
                Select a batch on the left, or create a new one to start a migration.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Actions + summary */}
              <Card className="sc-panel border-0 overflow-hidden">
                <CardHeader className="py-4 px-5 border-b border-panel" style={{ background: "var(--sc-inner)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg font-semibold text-sc flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-sc-blue" /> {selectedBatch.fileName}
                      </CardTitle>
                      <CardDescription className="text-sc-3 mt-1 text-sm capitalize">
                        {selectedBatch.entity} · {selectedBatch.dryRun ? "Dry run" : "Executed"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={batchStatusClass(selectedBatch.status)} data-testid="text-batch-status">
                      {selectedBatch.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  {summary && (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3" data-testid="migration-summary">
                      <SummaryStat label="Total" value={summary.totalRows} />
                      <SummaryStat label="Valid" value={summary.validRows} tone="green" />
                      <SummaryStat label="Errors" value={summary.errorRows} tone="red" />
                      <SummaryStat label="Duplicates" value={summary.duplicateRows} tone="amber" />
                      <SummaryStat label="Imported" value={summary.importedRows} tone="blue" />
                      <SummaryStat label="Failed" value={summary.failedRows} tone="red" />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      className="text-white"
                      style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }}
                      onClick={handleValidate}
                      disabled={busy || mappingLocked}
                      data-testid="button-migration-validate"
                    >
                      {validateBatch.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                      Validate (Dry Run)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-500"
                      onClick={handleImport}
                      disabled={busy || selectedBatch.status !== "Validated"}
                      data-testid="button-migration-import"
                    >
                      {importBatch.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5 mr-1.5" />}
                      Execute Import
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-panel text-sc-2"
                      onClick={handleRollback}
                      disabled={busy || selectedBatch.status !== "Imported"}
                      data-testid="button-migration-rollback"
                    >
                      {rollbackBatch.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5 mr-1.5" />}
                      Rollback
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-panel text-sc-2"
                      onClick={handleExportFailed}
                      disabled={failedRowsQuery.isFetching}
                      data-testid="button-export-failed-rows"
                    >
                      {failedRowsQuery.isFetching ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                      Export Failed Rows
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive/30 text-destructive"
                      onClick={handleDelete}
                      disabled={deleteBatch.isPending}
                      data-testid="button-delete-batch"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Column mapping */}
              <Card className="sc-panel border-0 overflow-hidden">
                <CardHeader className="py-4 px-5 border-b border-panel" style={{ background: "var(--sc-inner)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-semibold text-sc flex items-center gap-2">
                        <Layers className="w-4 h-4 text-sc-blue" /> Column Mapping
                      </CardTitle>
                      <CardDescription className="text-sc-3 mt-1 text-sm">
                        Map each ServiceConnect field to a column from your CSV.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {applicableTemplates.length > 0 && (
                        <Select onValueChange={applyTemplate}>
                          <SelectTrigger className="w-[170px] h-9 text-sm text-sc" style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }} data-testid="select-apply-template">
                            <SelectValue placeholder="Apply template" />
                          </SelectTrigger>
                          <SelectContent className="text-sc" style={{ background: "var(--sc-panel-2)", border: "1px solid var(--sc-line)" }}>
                            {applicableTemplates.map((t) => (
                              <SelectItem key={t.id} value={t.id} data-testid={`template-option-${t.id}`}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  {mappingLocked && (
                    <div className="flex items-center gap-2 text-xs text-sc-3">
                      <AlertTriangle className="w-3.5 h-3.5 text-sc-orange" /> This batch is imported — mapping is locked.
                    </div>
                  )}
                  <div className="space-y-2">
                    {(entitySpec?.fields ?? []).map((f) => (
                      <div key={f.target} className="grid grid-cols-2 gap-3 items-center" data-testid={`mapping-field-${f.target}`}>
                        <div className="text-sm text-sc-2 flex items-center gap-1.5">
                          {f.label}
                          {f.required && <span className="text-destructive">*</span>}
                          <span className="text-[10px] text-sc-3 uppercase">{f.type}</span>
                        </div>
                        <Select
                          value={mappingDraft[f.target] ?? NONE}
                          onValueChange={(v) => setMappingDraft((p) => ({ ...p, [f.target]: v }))}
                          disabled={mappingLocked}
                        >
                          <SelectTrigger className="h-9 text-sm text-sc" style={{ background: "var(--sc-panel)", border: "1px solid var(--sc-line)" }} data-testid={`select-mapping-${f.target}`}>
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent className="text-sc" style={{ background: "var(--sc-panel-2)", border: "1px solid var(--sc-line)" }}>
                            <SelectItem value={NONE}>— Not mapped —</SelectItem>
                            {selectedBatch.sourceColumns.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-panel">
                    <Button
                      size="sm"
                      className="text-white"
                      style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }}
                      onClick={handleSaveMapping}
                      disabled={updateMapping.isPending || mappingLocked}
                      data-testid="button-save-mapping"
                    >
                      {updateMapping.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                      Save Mapping
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-panel text-sc-2"
                      onClick={() => setTemplateOpen(true)}
                      disabled={mappingLocked}
                      data-testid="button-save-template"
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" /> Save as Template
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Rows */}
              <Card className="sc-panel border-0 overflow-hidden">
                <CardHeader className="py-4 px-5 border-b border-panel" style={{ background: "var(--sc-inner)" }}>
                  <CardTitle className="text-base font-semibold text-sc flex items-center gap-2">
                    <Database className="w-4 h-4 text-sc-blue" /> Row-Level Report
                  </CardTitle>
                  <CardDescription className="text-sc-3 mt-1 text-sm">
                    Per-row status, preserved source IDs, and validation errors.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {rowsQuery.isLoading ? (
                    <div className="py-12 text-center" data-testid="text-rows-loading">
                      <Loader2 className="w-5 h-5 text-sc-blue animate-spin mx-auto" />
                    </div>
                  ) : rows.length === 0 ? (
                    <div className="py-12 text-center text-sm text-sc-3" data-testid="empty-rows">No rows in this batch.</div>
                  ) : (
                    <div className="max-h-[440px] overflow-y-auto scrollbar-thin divide-y divide-[color:var(--sc-line-subtle)]">
                      {rows.map((r) => (
                        <div key={r.id} className="px-5 py-3 hover:bg-white/[0.04] transition-colors" data-testid={`migration-row-${r.id}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xs text-sc-3 w-8 shrink-0">#{r.rowNumber}</span>
                              <span className="text-sm text-sc truncate">
                                {r.sourceId ? <span className="text-sc-3">src:</span> : null} {r.sourceId ?? "—"}
                              </span>
                            </div>
                            <Badge variant="outline" className={rowStatusClass(r.status)}>{r.status}</Badge>
                          </div>
                          {r.errors.length > 0 && (
                            <ul className="mt-1.5 ml-11 space-y-0.5">
                              {r.errors.map((err, i) => (
                                <li key={i} className="text-xs text-destructive flex items-center gap-1.5">
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  <span className="font-medium">{err.field}:</span> {err.message}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Create batch dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreate(); }}>
        <DialogContent className="max-w-lg bg-card border-panel text-sc">
          <DialogHeader className="border-b border-panel pb-4">
            <DialogTitle className="text-lg text-sc flex items-center gap-2">
              <Upload className="w-4 h-4 text-sc-blue" /> New Migration Batch
            </DialogTitle>
            <DialogDescription className="text-sc-3">
              Upload a CSV exported from BlueFolder. A mapping is auto-guessed and can be refined afterwards.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sc-2">Target entity</Label>
              <Select value={cEntity} onValueChange={setCEntity} disabled={entitiesQuery.isLoading}>
                <SelectTrigger className="bg-elevated border-panel text-sc" data-testid="select-batch-entity">
                  <SelectValue placeholder={entitiesQuery.isLoading ? "Loading…" : "Select entity"} />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((e) => (
                    <SelectItem key={e.entity} value={e.entity} data-testid={`entity-option-${e.entity}`}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sc-2">CSV file</Label>
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="bg-elevated border-panel text-sc"
                data-testid="input-batch-file"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sc-2">File name</Label>
              <Input value={cFileName} onChange={(e) => setCFileName(e.target.value)} placeholder="bluefolder-customers.csv" className="bg-elevated border-panel text-sc" data-testid="input-batch-filename" />
            </div>
            <div className="space-y-2">
              <Label className="text-sc-2">CSV content (paste or upload)</Label>
              <Textarea
                value={cCsv}
                onChange={(e) => setCCsv(e.target.value)}
                placeholder="name,email,phone&#10;Acme Inc,ops@acme.com,555-0100"
                className="bg-elevated border-panel text-sc font-mono text-xs h-32"
                data-testid="input-batch-csv"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-panel text-sc-2" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              className="text-white"
              style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }}
              onClick={handleCreate}
              disabled={createBatch.isPending}
              data-testid="button-submit-batch"
            >
              {createBatch.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Create Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save template dialog */}
      <Dialog open={templateOpen} onOpenChange={(open) => { setTemplateOpen(open); if (!open) setTemplateName(""); }}>
        <DialogContent className="max-w-md bg-card border-panel text-sc">
          <DialogHeader className="border-b border-panel pb-4">
            <DialogTitle className="text-lg text-sc flex items-center gap-2">
              <Save className="w-4 h-4 text-sc-blue" /> Save Mapping Template
            </DialogTitle>
            <DialogDescription className="text-sc-3">Reuse this column mapping for future {selectedBatch?.entity} imports.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sc-2">Template name</Label>
              <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="BlueFolder Customers v1" className="bg-elevated border-panel text-sc" data-testid="input-template-name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-panel text-sc-2" onClick={() => setTemplateOpen(false)}>Cancel</Button>
            <Button
              className="text-white"
              style={{ background: "var(--sc-btn)", border: "1px solid var(--sc-btn-highlight)" }}
              onClick={handleSaveTemplate}
              disabled={createTemplate.isPending}
              data-testid="button-submit-template"
            >
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone?: "green" | "red" | "amber" | "blue" }) {
  const color =
    tone === "green" ? "text-emerald-500" : tone === "red" ? "text-destructive" : tone === "amber" ? "text-amber-500" : tone === "blue" ? "text-sc-blue" : "text-sc";
  return (
    <div className="rounded-lg p-3 text-center" style={{ background: "var(--sc-panel-2)", border: "1px solid var(--sc-line)" }} data-testid={`stat-${label.toLowerCase()}`}>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-sc-3 uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}
