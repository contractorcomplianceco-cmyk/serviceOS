import { Router, type IRouter } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, filesTable } from "@workspace/db";
import { CreateFileBody } from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import { isValidRole, canViewDocumentVisibility } from "../lib/authz";
import { toFileRecord } from "../lib/serialize-ops";
import { ObjectStorageService } from "../lib/objectStorage";
import { checkFilePolicy } from "../lib/file-policy";
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
  const policyError = checkFilePolicy({ size: d.size, contentType: d.contentType });
  if (policyError) {
    res.status(400).json({ error: policyError });
    return;
  }
  const objectPath = objectStorage.normalizeObjectEntityPath(d.objectPath);
  if (!objectPath.startsWith("/objects/")) {
    res.status(400).json({ error: "Object path is not a stored entity" });
    return;
  }
  // Verify the object actually exists in storage before persisting metadata, so
  // a client cannot record a row for an upload that never completed.
  try {
    await objectStorage.getObjectEntityFile(objectPath);
  } catch {
    res.status(400).json({ error: "Uploaded object could not be verified" });
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
  const entityType = d.entityType ?? "Misc";
  const entityId = d.entityId ?? null;
  // Deterministic version increment: a new upload for the same logical target
  // (tenant + entityType + entityId + name) supersedes prior ones as version N+1.
  const targetConds = [
    eq(filesTable.tenantId, user.tenantId),
    eq(filesTable.entityType, entityType),
    eq(filesTable.name, d.name),
  ];
  if (entityId === null) {
    targetConds.push(isNull(filesTable.entityId));
  } else {
    targetConds.push(eq(filesTable.entityId, entityId));
  }
  const [latest] = await db
    .select({ version: filesTable.version })
    .from(filesTable)
    .where(and(...targetConds))
    .orderBy(desc(filesTable.version))
    .limit(1);
  const nextVersion = (latest?.version ?? 0) + 1;
  const [row] = await db
    .insert(filesTable)
    .values({
      tenantId: user.tenantId,
      objectPath,
      name: d.name,
      contentType: d.contentType,
      size: d.size,
      entityType,
      entityId,
      version: nextVersion,
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
