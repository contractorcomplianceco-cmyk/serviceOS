import type { Readable } from "stream";

// Backend-agnostic storage abstraction. Routes depend ONLY on this interface so
// the same upload/serve/verify logic works against either the production
// object-storage backend or the dev-local filesystem backend.
export type StorageBackend = "object-storage" | "local-filesystem";

export interface UploadTarget {
  // Where the client PUTs the raw bytes.
  uploadURL: string;
  // Normalized `/objects/...` path recorded in the files table.
  objectPath: string;
}

export interface ObjectStat {
  size: number;
  contentType: string;
}

export interface ObjectDownload {
  stream: Readable;
  contentType: string;
  size?: number;
  cacheControl: string;
}

export interface StorageAdapter {
  readonly backend: StorageBackend;
  requestUploadTarget(): Promise<UploadTarget>;
  normalizeObjectPath(rawPath: string): string;
  // Read the ACTUAL persisted object metadata (used for server-side
  // verification). Returns null when the object does not exist.
  statObject(objectPath: string): Promise<ObjectStat | null>;
  openObject(objectPath: string): Promise<ObjectDownload | null>;
  openPublicObject(filePath: string): Promise<ObjectDownload | null>;
  setObjectAcl(
    objectPath: string,
    owner: string,
    visibility: "public" | "private",
  ): Promise<void>;
}
