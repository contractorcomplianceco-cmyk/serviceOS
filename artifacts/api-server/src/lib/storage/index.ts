import type { StorageAdapter, StorageBackend } from "./types";
import { ObjectStorageAdapter } from "./objectStorageAdapter";
import { LocalFilesystemStorageAdapter } from "./localFilesystemAdapter";

export type {
  StorageAdapter,
  StorageBackend,
  UploadTarget,
  ObjectStat,
  ObjectDownload,
} from "./types";
export { ObjectStorageAdapter } from "./objectStorageAdapter";
export { LocalFilesystemStorageAdapter } from "./localFilesystemAdapter";

let cached: StorageAdapter | null = null;

// Backend selection: honor an explicit STORAGE_BACKEND override, otherwise use
// the production object-storage backend when the Replit bucket env is present,
// and fall back to the dev-local filesystem backend when it is not.
export function selectStorageBackend(): StorageBackend {
  const explicit = (process.env.STORAGE_BACKEND || "").toLowerCase();
  if (explicit === "local" || explicit === "local-filesystem") {
    return "local-filesystem";
  }
  if (explicit === "object" || explicit === "object-storage") {
    return "object-storage";
  }
  const hasObjectStorage =
    Boolean(process.env.PRIVATE_OBJECT_DIR) &&
    Boolean(process.env.PUBLIC_OBJECT_SEARCH_PATHS);
  return hasObjectStorage ? "object-storage" : "local-filesystem";
}

export function getStorageAdapter(): StorageAdapter {
  if (cached) return cached;
  cached =
    selectStorageBackend() === "local-filesystem"
      ? new LocalFilesystemStorageAdapter()
      : new ObjectStorageAdapter();
  return cached;
}
