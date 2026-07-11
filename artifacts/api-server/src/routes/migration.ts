import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  migrationBatchesTable,
  migrationRowsTable,
  migrationTemplatesTable,
  type MigrationBatch,
  type MigrationColumnMap,
} from "@workspace/db";
import {
  CreateMigrationBatchBody,
  UpdateMigrationMappingBody,
  CreateMigrationTemplateBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import { canManageMigration, isValidRole } from "../lib/authz";
import {
  toMigrationBatch,
  toMigrationRow,
  toMigrationTemplate,
} from "../lib/serialize-ops";
import {
  parseCsv,
  ENTITY_SPECS,
  validateBatch,
  executeBatch,
  rollbackBatch,
  failedRowsExport,
} from "../lib/migration/engine";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

function requireAdmin(req: import("express").Request): boolean {
  const role = req.user!.role;
  return isValidRole(role) && canManageMigration(role);
}

// Auto-guess a column mapping by case-insensitively matching source columns to
// target field names/labels. Users can refine it before validating.
function guessMapping(
  entity: keyof typeof ENTITY_SPECS,
  sourceColumns: string[],
): MigrationColumnMap[] {
  const spec = ENTITY_SPECS[entity];
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return spec.fields.map((f) => {
    const match = sourceColumns.find(
      (c) => norm(c) === norm(f.target) || norm(c) === norm(f.label),
    );
    return { target: f.target, source: match ?? null };
  });
}

async function load(
  tenantId: string,
  id: string,
): Promise<MigrationBatch | undefined> {
  const [row] = await db
    .select()
    .from(migrationBatchesTable)
    .where(
      and(
        eq(migrationBatchesTable.id, id),
        eq(migrationBatchesTable.tenantId, tenantId),
      ),
    );
  return row;
}

router.get(
  "/migration/entities",
  requireAuth,
  async (req, res): Promise<void> => {
    if (!requireAdmin(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.json(Object.values(ENTITY_SPECS));
  },
);

router.get(
  "/migration/batches",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!requireAdmin(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const rows = await db
      .select()
      .from(migrationBatchesTable)
      .where(eq(migrationBatchesTable.tenantId, user.tenantId))
      .orderBy(migrationBatchesTable.createdAt);
    res.json(rows.reverse().map(toMigrationBatch));
  },
);

router.post(
  "/migration/batches",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!requireAdmin(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const parsed = CreateMigrationBatchBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const entity = d.entity as keyof typeof ENTITY_SPECS;
    const { columns, rows } = parseCsv(d.csv);
    if (columns.length === 0 || rows.length === 0) {
      res.status(400).json({ error: "CSV has no data rows" });
      return;
    }
    const mapping =
      d.mapping && d.mapping.length > 0
        ? (d.mapping as MigrationColumnMap[])
        : guessMapping(entity, columns);
    const [batch] = await db
      .insert(migrationBatchesTable)
      .values({
        tenantId: user.tenantId,
        entity,
        fileName: d.fileName,
        status: "Draft",
        sourceColumns: columns,
        mapping,
        dryRun: true,
        createdByUserId: user.id,
      })
      .returning();
    await db.insert(migrationRowsTable).values(
      rows.map((raw, idx) => ({
        tenantId: user.tenantId,
        batchId: batch!.id,
        rowNumber: idx + 1,
        raw,
        mapped: {},
        status: "Valid" as const,
        errors: [],
      })),
    );
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Created",
        entityType: "MigrationBatch",
        entityId: batch!.id,
        summary: `Migration batch "${d.fileName}" (${entity}, ${rows.length} rows) uploaded`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.status(201).json(toMigrationBatch(batch!));
  },
);

router.get(
  "/migration/templates",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!requireAdmin(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const rows = await db
      .select()
      .from(migrationTemplatesTable)
      .where(eq(migrationTemplatesTable.tenantId, user.tenantId))
      .orderBy(migrationTemplatesTable.createdAt);
    res.json(rows.reverse().map(toMigrationTemplate));
  },
);

router.post(
  "/migration/templates",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!requireAdmin(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const parsed = CreateMigrationTemplateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [row] = await db
      .insert(migrationTemplatesTable)
      .values({
        tenantId: user.tenantId,
        name: d.name,
        entity: d.entity,
        mapping: d.mapping as MigrationColumnMap[],
        createdByUserId: user.id,
      })
      .returning();
    res.status(201).json(toMigrationTemplate(row!));
  },
);

router.get(
  "/migration/batches/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!requireAdmin(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const batch = await load(user.tenantId, String(req.params.id));
    if (!batch) {
      res.status(404).json({ error: "Batch not found" });
      return;
    }
    res.json(toMigrationBatch(batch));
  },
);

router.delete(
  "/migration/batches/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!requireAdmin(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const batch = await load(user.tenantId, String(req.params.id));
    if (!batch) {
      res.status(404).json({ error: "Batch not found" });
      return;
    }
    await db.delete(migrationRowsTable).where(eq(migrationRowsTable.batchId, batch.id));
    await db.delete(migrationBatchesTable).where(eq(migrationBatchesTable.id, batch.id));
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Deleted",
        entityType: "MigrationBatch",
        entityId: batch.id,
        summary: `Migration batch "${batch.fileName}" deleted`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.status(204).end();
  },
);

router.get(
  "/migration/batches/:id/rows",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!requireAdmin(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const batch = await load(user.tenantId, String(req.params.id));
    if (!batch) {
      res.status(404).json({ error: "Batch not found" });
      return;
    }
    const rows = await db
      .select()
      .from(migrationRowsTable)
      .where(eq(migrationRowsTable.batchId, batch.id))
      .orderBy(migrationRowsTable.rowNumber);
    res.json(rows.map(toMigrationRow));
  },
);

router.patch(
  "/migration/batches/:id/mapping",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!requireAdmin(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const parsed = UpdateMigrationMappingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const batch = await load(user.tenantId, String(req.params.id));
    if (!batch) {
      res.status(404).json({ error: "Batch not found" });
      return;
    }
    if (batch.status === "Imported") {
      res.status(400).json({ error: "Cannot remap an imported batch" });
      return;
    }
    const [row] = await db
      .update(migrationBatchesTable)
      .set({
        mapping: parsed.data.mapping as MigrationColumnMap[],
        status: "Draft",
        summary: null,
        updatedAt: new Date(),
      })
      .where(eq(migrationBatchesTable.id, batch.id))
      .returning();
    res.json(toMigrationBatch(row!));
  },
);

router.post(
  "/migration/batches/:id/validate",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!requireAdmin(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const batch = await load(user.tenantId, String(req.params.id));
    if (!batch) {
      res.status(404).json({ error: "Batch not found" });
      return;
    }
    const updated = await validateBatch(batch);
    res.json(toMigrationBatch(updated));
  },
);

router.post(
  "/migration/batches/:id/import",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!requireAdmin(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const batch = await load(user.tenantId, String(req.params.id));
    if (!batch) {
      res.status(404).json({ error: "Batch not found" });
      return;
    }
    if (batch.status !== "Validated") {
      res.status(400).json({ error: "Batch must be validated before import" });
      return;
    }
    const updated = await executeBatch(batch);
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Imported",
        entityType: "MigrationBatch",
        entityId: batch.id,
        summary: `Migration batch "${batch.fileName}" imported (${updated.summary?.importedRows ?? 0} rows)`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toMigrationBatch(updated));
  },
);

router.post(
  "/migration/batches/:id/rollback",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!requireAdmin(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const batch = await load(user.tenantId, String(req.params.id));
    if (!batch) {
      res.status(404).json({ error: "Batch not found" });
      return;
    }
    if (batch.status !== "Imported") {
      res.status(400).json({ error: "Only imported batches can be rolled back" });
      return;
    }
    const updated = await rollbackBatch(batch);
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "RolledBack",
        entityType: "MigrationBatch",
        entityId: batch.id,
        summary: `Migration batch "${batch.fileName}" rolled back`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toMigrationBatch(updated));
  },
);

router.get(
  "/migration/batches/:id/failed-rows",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!requireAdmin(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const batch = await load(user.tenantId, String(req.params.id));
    if (!batch) {
      res.status(404).json({ error: "Batch not found" });
      return;
    }
    const csv = await failedRowsExport(batch);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="failed-rows-${batch.id}.csv"`,
    );
    res.send(csv);
  },
);

export default router;
