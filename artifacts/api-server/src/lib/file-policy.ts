// Server-side upload policy. Both the upload-URL issuer and the /files metadata
// persister enforce this so a client cannot smuggle a disallowed type/size by
// skipping one step.

// 25 MB cap for attachments/photos/signatures/documents.
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

// Allowlist of content types the vault accepts.
export const ALLOWED_CONTENT_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export interface FilePolicyInput {
  size: number;
  contentType: string;
}

/** Strip parameters (e.g. "; charset=utf-8") and lowercase for comparison. */
export function normalizeContentType(ct: string): string {
  return (ct.split(";")[0] ?? "").trim().toLowerCase();
}

/** Returns an error message when the file violates policy, else null. */
export function checkFilePolicy(input: FilePolicyInput): string | null {
  if (!Number.isFinite(input.size) || input.size <= 0) {
    return "File size must be a positive number";
  }
  if (input.size > MAX_FILE_SIZE) {
    return `File exceeds the ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB limit`;
  }
  if (!ALLOWED_CONTENT_TYPES.includes(input.contentType)) {
    return `Content type "${input.contentType}" is not allowed`;
  }
  return null;
}
