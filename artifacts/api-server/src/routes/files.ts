import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, filesTable } from "@workspace/db";
import { CreateFileBody } from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import { isValidRole, canViewDocumentVisibility } from "../lib/authz";
import { toFileRecord } from "../lib/serialize-ops";
import { ObjectStorageService } from "../lib/objectStorage";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();
const objectStorage = new ObjectStorageService();

// GET /files?entityType=&entityId= — list file metadata the caller may see.
router.get("/files", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const entityType =
    typeof req.query.entityType === "string" ? req.query.entityType : undefined;
  const entityId =
    typeof req.query.entityId === "string" ? req.query.entityId : undefined;
  const conds = [eq(filesTable.tenantId, user.tenantId)];
  if (entityType) conds.push(eq(filesTable.entityType, entityType));
  if (entityId) conds.push(eq(filesTable.entityId, entityId));
  const rows = await db
    .select()
    .from(filesTable)
    .where(and(...conds))
    .orderBy(desc(filesTable.createdAt));
  const visible = rows.filter(
    (r) => isValidRole(user.role) && canViewDocumentVisibility(user.role, r.visibility),
  );
  res.json(visible.map(toFileRecord));
});

// POST /files — persist metadata for a file already uploaded to object storage.
// Validates content type + size, normalizes the object path, and (for private
// uploads) records an ACL owner so download authz can enforce it.
router.post("/files", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const parsed = CreateFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid file metadata" });
    return;
  }
  const d = parsed.data;
  const objectPath = objectStorage.normalizeObjectEntityPath(d.objectPath);
  if (!objectPath.startsWith("/objects/")) {
    res.status(400).json({ error: "Object path is not a stored entity" });
    return;
  }
  try {
    await objectStorage.trySetObjectEntityAclPolicy(objectPath, {
      owner: user.id,
      visibility: "private",
    });
  } catch (err) {
    req.log.warn({ err }, "Could not set ACL policy on uploaded object");
  }
  const [row] = await db
    .insert(filesTable)
    .values({
      tenantId: user.tenantId,
      objectPath,
      name: d.name,
      contentType: d.contentType,
      size: d.size,
      entityType: d.entityType ?? "Misc",
      entityId: d.entityId ?? null,
      visibility: d.visibility ?? "All Staff",
      uploadedByUserId: user.id,
      uploadedByName: user.name,
    })
    .returning();
  await writeAudit(
    {
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorName: user.name,
      action: "File Uploaded",
      entityType: "File",
      entityId: row!.id,
      summary: `Uploaded ${d.name} (${d.contentType}, ${d.size} bytes)`,
      ip: req.ip ?? null,
    },
    req,
  );
  res.json(toFileRecord(row!));
});

export default router;
