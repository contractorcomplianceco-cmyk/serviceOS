import { Router, type IRouter } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, filesTable } from "@workspace/db";
import { CreateFileBody } from "@workspace/api-zod";
import { requireAuth, requireStaff } from "../middleware/auth";
import { isValidRole, canViewDocumentVisibility } from "../lib/authz";
import { toFileRecord } from "../lib/serialize-ops";
import { getStorageAdapter } from "../lib/storage";
import { checkFilePolicy, normalizeContentType } from "../lib/file-policy";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

// GET /files?entityType=&entityId= — list file metadata the caller may see.
router.get("/files", requireAuth, requireStaff, async (req, res): Promise<void> => {
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
  const declaredPolicyError = checkFilePolicy({
    size: d.size,
    contentType: d.contentType,
  });
  if (declaredPolicyError) {
    res.status(400).json({ error: declaredPolicyError });
    return;
  }
  const storage = getStorageAdapter();
  const objectPath = storage.normalizeObjectPath(d.objectPath);
  if (!objectPath.startsWith("/objects/")) {
    res.status(400).json({ error: "Object path is not a stored entity" });
    return;
  }
  // Server-side verification: the trusted source of truth is the stored object,
  // NOT the client JSON. Read the ACTUAL persisted metadata and (1) confirm the
  // upload exists, (2) enforce the type/size policy against the real bytes, and
  // (3) reject when the client-declared size/contentType do not match what was
  // actually stored. This makes upload policy untamperable by the client.
  const stat = await storage.statObject(objectPath);
  if (!stat) {
    res.status(400).json({ error: "Uploaded object could not be verified" });
    return;
  }
  const actualPolicyError = checkFilePolicy({
    size: stat.size,
    contentType: stat.contentType,
  });
  if (actualPolicyError) {
    res.status(400).json({ error: actualPolicyError });
    return;
  }
  if (
    stat.size !== d.size ||
    normalizeContentType(stat.contentType) !== normalizeContentType(d.contentType)
  ) {
    res
      .status(400)
      .json({ error: "Declared file metadata does not match the uploaded object" });
    return;
  }
  try {
    await storage.setObjectAcl(objectPath, user.id, "private");
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
      contentType: stat.contentType,
      size: stat.size,
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
