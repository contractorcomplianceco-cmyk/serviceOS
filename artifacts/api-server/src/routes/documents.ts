import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  documentsTable,
  documentVersionsTable,
  documentRemindersTable,
  type DocumentRecord,
} from "@workspace/db";
import {
  CreateDocumentBody,
  UpdateDocumentParams,
  UpdateDocumentBody,
  ListDocumentVersionsParams,
  AddDocumentVersionParams,
  AddDocumentVersionBody,
  ListDocumentRemindersParams,
  AddDocumentReminderParams,
  AddDocumentReminderBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import {
  canManageDocuments,
  canViewDocumentVisibility,
  isValidRole,
} from "../lib/authz";
import {
  toDocument,
  toDocumentVersion,
  toDocumentReminder,
} from "../lib/serialize-ops";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

function requireManage(
  req: import("express").Request,
  res: import("express").Response,
) {
  const user = req.user!;
  if (!isValidRole(user.role) || !canManageDocuments(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return user;
}

// Load a document and enforce visibility. Returns undefined for not-found and
// null for forbidden so callers can distinguish 404 from 403.
async function loadVisibleDocument(
  req: import("express").Request,
  id: string,
): Promise<DocumentRecord | undefined | null> {
  const user = req.user!;
  const [row] = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.id, id), eq(documentsTable.tenantId, user.tenantId)));
  if (!row) return undefined;
  if (!isValidRole(user.role) || !canViewDocumentVisibility(user.role, row.visibility)) {
    return null;
  }
  return row;
}

router.get("/documents", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const rows = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.tenantId, user.tenantId))
    .orderBy(documentsTable.name);
  const visible = rows.filter(
    (r) => isValidRole(user.role) && canViewDocumentVisibility(user.role, r.visibility),
  );
  res.json(visible.map(toDocument));
});

router.post("/documents", requireAuth, async (req, res): Promise<void> => {
  const user = requireManage(req, res);
  if (!user) return;
  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid document" });
    return;
  }
  const d = parsed.data;
  const [row] = await db
    .insert(documentsTable)
    .values({
      tenantId: user.tenantId,
      customerId: d.customerId ?? null,
      name: d.name,
      type: d.type ?? "Contract",
      visibility: d.visibility ?? "All Staff",
      expiration: d.expiration ?? null,
      currentVersion: 0,
    })
    .returning();
  await writeAudit(
    {
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorName: user.name,
      action: "Document Created",
      entityType: "Document",
      entityId: row!.id,
      summary: `Created document ${row!.name}`,
      ip: req.ip ?? null,
    },
    req,
  );
  res.json(toDocument(row!));
});

router.patch("/documents/:id", requireAuth, async (req, res): Promise<void> => {
  const user = requireManage(req, res);
  if (!user) return;
  const params = UpdateDocumentParams.safeParse(req.params);
  const parsed = UpdateDocumentBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid update" });
    return;
  }
  const doc = await loadVisibleDocument(req, params.data.id);
  if (doc === undefined) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  if (doc === null) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [row] = await db
    .update(documentsTable)
    .set({ ...parsed.data })
    .where(eq(documentsTable.id, doc.id))
    .returning();
  await writeAudit(
    {
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorName: user.name,
      action: "Document Updated",
      entityType: "Document",
      entityId: doc.id,
      summary: `Updated document ${row!.name}`,
      ip: req.ip ?? null,
    },
    req,
  );
  res.json(toDocument(row!));
});

router.get(
  "/documents/:id/versions",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListDocumentVersionsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const doc = await loadVisibleDocument(req, params.data.id);
    if (doc === undefined) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    if (doc === null) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const rows = await db
      .select()
      .from(documentVersionsTable)
      .where(eq(documentVersionsTable.documentId, doc.id))
      .orderBy(documentVersionsTable.version);
    res.json(rows.reverse().map(toDocumentVersion));
  },
);

router.post(
  "/documents/:id/versions",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = requireManage(req, res);
    if (!user) return;
    const params = AddDocumentVersionParams.safeParse(req.params);
    const parsed = AddDocumentVersionBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid version" });
      return;
    }
    const doc = await loadVisibleDocument(req, params.data.id);
    if (doc === undefined) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    if (doc === null) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const d = parsed.data;
    try {
      const out = await db.transaction(async (tx) => {
        const [locked] = await tx
          .select()
          .from(documentsTable)
          .where(eq(documentsTable.id, doc.id))
          .for("update");
        const nextVersion = locked!.currentVersion + 1;
        const [version] = await tx
          .insert(documentVersionsTable)
          .values({
            tenantId: user.tenantId,
            documentId: doc.id,
            version: nextVersion,
            fileId: d.fileId,
            notes: d.notes ?? null,
            uploadedByUserId: user.id,
            uploadedByName: user.name,
          })
          .returning();
        await tx
          .update(documentsTable)
          .set({ currentVersion: nextVersion })
          .where(eq(documentsTable.id, doc.id));
        return version!;
      });
      await writeAudit(
        {
          tenantId: user.tenantId,
          actorUserId: user.id,
          actorName: user.name,
          action: "Document Version Added",
          entityType: "Document",
          entityId: doc.id,
          summary: `${doc.name}: version ${out.version}`,
          ip: req.ip ?? null,
        },
        req,
      );
      res.json(toDocumentVersion(out));
    } catch (err) {
      req.log.error({ err }, "Failed to add document version");
      res.status(500).json({ error: "Failed to add document version" });
    }
  },
);

router.get(
  "/documents/:id/reminders",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListDocumentRemindersParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const doc = await loadVisibleDocument(req, params.data.id);
    if (doc === undefined) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    if (doc === null) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const rows = await db
      .select()
      .from(documentRemindersTable)
      .where(eq(documentRemindersTable.documentId, doc.id))
      .orderBy(documentRemindersTable.remindAt);
    res.json(rows.map(toDocumentReminder));
  },
);

router.post(
  "/documents/:id/reminders",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = requireManage(req, res);
    if (!user) return;
    const params = AddDocumentReminderParams.safeParse(req.params);
    const parsed = AddDocumentReminderBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid reminder" });
      return;
    }
    const doc = await loadVisibleDocument(req, params.data.id);
    if (doc === undefined) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    if (doc === null) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const d = parsed.data;
    const [row] = await db
      .insert(documentRemindersTable)
      .values({
        tenantId: user.tenantId,
        documentId: doc.id,
        remindAt: d.remindAt,
        reason: d.reason ?? "",
        status: "Pending",
        createdByUserId: user.id,
        createdByName: user.name,
      })
      .returning();
    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Document Reminder Set",
        entityType: "Document",
        entityId: doc.id,
        summary: `${doc.name}: reminder ${d.remindAt}`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toDocumentReminder(row!));
  },
);

export default router;
