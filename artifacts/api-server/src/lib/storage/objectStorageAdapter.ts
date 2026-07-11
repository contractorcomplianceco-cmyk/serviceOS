import { ObjectStorageService, ObjectNotFoundError } from "../objectStorage";
import type {
  StorageAdapter,
  UploadTarget,
  ObjectStat,
  ObjectDownload,
} from "./types";

// Production backend: Replit App Storage (GCS-backed), per the object-storage
// skill. Presigned PUT uploads, object serving, and custom-metadata ACLs.
export class ObjectStorageAdapter implements StorageAdapter {
  readonly backend = "object-storage" as const;
  private svc = new ObjectStorageService();

  async requestUploadTarget(): Promise<UploadTarget> {
    const uploadURL = await this.svc.getObjectEntityUploadURL();
    const objectPath = this.svc.normalizeObjectEntityPath(uploadURL);
    return { uploadURL, objectPath };
  }

  normalizeObjectPath(rawPath: string): string {
    return this.svc.normalizeObjectEntityPath(rawPath);
  }

  async statObject(objectPath: string): Promise<ObjectStat | null> {
    try {
      const file = await this.svc.getObjectEntityFile(objectPath);
      const [m] = await file.getMetadata();
      return {
        size: Number(m.size ?? 0),
        contentType: (m.contentType as string) || "application/octet-stream",
      };
    } catch (err) {
      if (err instanceof ObjectNotFoundError) return null;
      throw err;
    }
  }

  async openObject(objectPath: string): Promise<ObjectDownload | null> {
    try {
      const file = await this.svc.getObjectEntityFile(objectPath);
      const [m] = await file.getMetadata();
      return {
        stream: file.createReadStream(),
        contentType: (m.contentType as string) || "application/octet-stream",
        size: m.size ? Number(m.size) : undefined,
        cacheControl: "private, max-age=3600",
      };
    } catch (err) {
      if (err instanceof ObjectNotFoundError) return null;
      throw err;
    }
  }

  async openPublicObject(filePath: string): Promise<ObjectDownload | null> {
    const file = await this.svc.searchPublicObject(filePath);
    if (!file) return null;
    const [m] = await file.getMetadata();
    return {
      stream: file.createReadStream(),
      contentType: (m.contentType as string) || "application/octet-stream",
      size: m.size ? Number(m.size) : undefined,
      cacheControl: "public, max-age=3600",
    };
  }

  async setObjectAcl(
    objectPath: string,
    owner: string,
    visibility: "public" | "private",
  ): Promise<void> {
    await this.svc.trySetObjectEntityAclPolicy(objectPath, { owner, visibility });
  }
}
