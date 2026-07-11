import { createReadStream, promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  StorageAdapter,
  UploadTarget,
  ObjectStat,
  ObjectDownload,
} from "./types";

interface LocalMeta {
  contentType: string;
  size: number;
  owner?: string;
  visibility?: "public" | "private";
}

// Dev-local backend: stores bytes on the local filesystem. Uploads are streamed
// to the api-server's PUT sink (see routes/storage.ts) rather than a presigned
// third-party URL. Object metadata is kept in a per-object `<file>.meta.json`
// sidecar so statObject/openObject can report the real content-type + size and
// ACLs can be persisted — mirroring the object-storage backend's guarantees.
export class LocalFilesystemStorageAdapter implements StorageAdapter {
  readonly backend = "local-filesystem" as const;
  private baseDir: string;
  private objectsDir: string;
  private publicDir: string;

  constructor() {
    this.baseDir = path.resolve(process.env.LOCAL_STORAGE_DIR || ".local/storage");
    this.objectsDir = path.join(this.baseDir, "objects");
    this.publicDir = path.join(this.baseDir, "public");
  }

  private resolveObject(objectPath: string): string | null {
    if (!objectPath.startsWith("/objects/")) return null;
    const rel = objectPath.slice("/objects/".length);
    const full = path.join(this.objectsDir, rel);
    // Guard against path traversal outside the objects root.
    if (full !== this.objectsDir && !full.startsWith(`${this.objectsDir}${path.sep}`)) {
      return null;
    }
    return full;
  }

  private async readMeta(full: string): Promise<LocalMeta | null> {
    try {
      return JSON.parse(await fs.readFile(`${full}.meta.json`, "utf8")) as LocalMeta;
    } catch {
      return null;
    }
  }

  async requestUploadTarget(): Promise<UploadTarget> {
    const id = randomUUID();
    return {
      uploadURL: `/api/storage/uploads/local/${id}`,
      objectPath: `/objects/uploads/${id}`,
    };
  }

  normalizeObjectPath(rawPath: string): string {
    if (rawPath.startsWith("/objects/")) return rawPath;
    const m = rawPath.match(/\/storage\/uploads\/local\/([^/?#]+)/);
    if (m) return `/objects/uploads/${m[1]}`;
    return rawPath;
  }

  // Persist bytes uploaded to the local PUT sink.
  async writeUpload(id: string, data: Buffer, contentType: string): Promise<void> {
    const full = this.resolveObject(`/objects/uploads/${id}`);
    if (!full) throw new Error("Invalid upload id");
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
    const meta: LocalMeta = { contentType, size: data.byteLength };
    await fs.writeFile(`${full}.meta.json`, JSON.stringify(meta));
  }

  async statObject(objectPath: string): Promise<ObjectStat | null> {
    const full = this.resolveObject(objectPath);
    if (!full) return null;
    try {
      const st = await fs.stat(full);
      const meta = await this.readMeta(full);
      return {
        size: st.size,
        contentType: meta?.contentType || "application/octet-stream",
      };
    } catch {
      return null;
    }
  }

  async openObject(objectPath: string): Promise<ObjectDownload | null> {
    const stat = await this.statObject(objectPath);
    if (!stat) return null;
    const full = this.resolveObject(objectPath)!;
    return {
      stream: createReadStream(full),
      contentType: stat.contentType,
      size: stat.size,
      cacheControl: "private, max-age=3600",
    };
  }

  async openPublicObject(filePath: string): Promise<ObjectDownload | null> {
    const full = path.join(this.publicDir, filePath);
    if (full !== this.publicDir && !full.startsWith(`${this.publicDir}${path.sep}`)) {
      return null;
    }
    try {
      const st = await fs.stat(full);
      const meta = await this.readMeta(full);
      return {
        stream: createReadStream(full),
        contentType: meta?.contentType || "application/octet-stream",
        size: st.size,
        cacheControl: "public, max-age=3600",
      };
    } catch {
      return null;
    }
  }

  async setObjectAcl(
    objectPath: string,
    owner: string,
    visibility: "public" | "private",
  ): Promise<void> {
    const full = this.resolveObject(objectPath);
    if (!full) return;
    const meta = (await this.readMeta(full)) ?? {
      contentType: "application/octet-stream",
      size: 0,
    };
    meta.owner = owner;
    meta.visibility = visibility;
    await fs.writeFile(`${full}.meta.json`, JSON.stringify(meta));
  }
}
