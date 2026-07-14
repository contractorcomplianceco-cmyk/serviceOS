import express, { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, filesTable } from "@workspace/db";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import {
  getStorageAdapter,
  LocalFilesystemStorageAdapter,
  type ObjectDownload,
} from "../lib/storage";
import { requireAuth, requireStaff } from "../middleware/auth";
import { isValidRole, canViewDocumentVisibility } from "../lib/authz";
import { checkFilePolicy, MAX_FILE_SIZE } from "../lib/file-policy";

const router: IRouter = Router();

function pipeDownload(res: Response, dl: ObjectDownload): void {
  res.setHeader("Content-Type", dl.contentType);
  res.setHeader("Cache-Control", dl.cacheControl);
  if (dl.size !== undefined) {
    res.setHeader("Content-Length", String(dl.size));
  }
  dl.stream.pipe(res);
}

/**
 * POST /storage/uploads/request-url
 *
 * Request an upload target for a file. The client sends JSON metadata (name,
 * size, contentType) — NOT the file — then uploads the bytes to the returned
 * uploadURL. The declared type/size are checked against policy here; the real
 * bytes are re-verified server-side when the metadata is persisted via /files.
 */
router.post(
  "/storage/uploads/request-url",
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required fields" });
      return;
    }

    const policyError = checkFilePolicy({
      size: parsed.data.size,
      contentType: parsed.data.contentType,
    });
    if (policyError) {
      res.status(400).json({ error: policyError });
      return;
    }

    try {
      const { name, size, contentType } = parsed.data;
      const target = await getStorageAdapter().requestUploadTarget();
      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL: target.uploadURL,
          objectPath: target.objectPath,
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Error generating upload URL");
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  },
);

/**
 * PUT /storage/uploads/local/:id
 *
 * Upload sink for the dev-local filesystem backend (the production
 * object-storage backend uploads directly to a presigned URL instead). Enforces
 * the same content-type/size policy on the raw bytes before persisting them.
 */
router.put(
  "/storage/uploads/local/:id",
  requireAuth,
  express.raw({ type: () => true, limit: MAX_FILE_SIZE }),
  async (req: Request, res: Response) => {
    const adapter = getStorageAdapter();
    if (!(adapter instanceof LocalFilesystemStorageAdapter)) {
      res.status(404).json({ error: "Local uploads are not enabled" });
      return;
    }
    const contentType = req.get("content-type") || "application/octet-stream";
    const body = req.body;
    if (!Buffer.isBuffer(body) || body.byteLength === 0) {
      res.status(400).json({ error: "Empty upload body" });
      return;
    }
    const policyError = checkFilePolicy({ size: body.byteLength, contentType });
    if (policyError) {
      res.status(400).json({ error: policyError });
      return;
    }
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    try {
      await adapter.writeUpload(id, body, contentType);
      res.status(200).json({ ok: true });
    } catch (error) {
      req.log.error({ err: error }, "Error writing local upload");
      res.status(500).json({ error: "Failed to store upload" });
    }
  },
);

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets. These are unconditionally public — no auth or ACL checks.
 */
router.get(
  "/storage/public-objects/*filePath",
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join("/") : raw;
      const dl = await getStorageAdapter().openPublicObject(filePath);
      if (!dl) {
        res.status(404).json({ error: "File not found" });
        return;
      }
      pipeDownload(res, dl);
    } catch (error) {
      req.log.error({ err: error }, "Error serving public object");
      res.status(500).json({ error: "Failed to serve public object" });
    }
  },
);

/**
 * GET /storage/objects/*
 *
 * Serve private object entities. Download authorization: the file must belong to
 * the caller's tenant and the caller's role must satisfy the file's visibility.
 * Metadata lives in the files table keyed by normalized objectPath.
 */
router.get(
  "/storage/objects/*path",
  requireAuth,
  requireStaff,
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const raw = req.params.path;
      const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
      const objectPath = `/objects/${wildcardPath}`;

      const [fileRow] = await db
        .select()
        .from(filesTable)
        .where(
          and(
            eq(filesTable.tenantId, user.tenantId),
            eq(filesTable.objectPath, objectPath),
          ),
        );
      if (!fileRow) {
        res.status(404).json({ error: "Object not found" });
        return;
      }
      if (
        !isValidRole(user.role) ||
        !canViewDocumentVisibility(user.role, fileRow.visibility)
      ) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const dl = await getStorageAdapter().openObject(objectPath);
      if (!dl) {
        res.status(404).json({ error: "Object not found" });
        return;
      }
      pipeDownload(res, dl);
    } catch (error) {
      req.log.error({ err: error }, "Error serving object");
      res.status(500).json({ error: "Failed to serve object" });
    }
  },
);

export default router;
