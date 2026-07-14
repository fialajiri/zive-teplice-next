// Object-storage port + the pure key/URL helpers around it. Zero framework deps:
// the S3 adapter (infrastructure/storage/s3.ts) implements this port, and the
// helpers are unit-tested in isolation (no AWS SDK, no network).

export type PresignUploadParams = {
  /** Raw client-supplied file name — sanitized before it reaches an object key. */
  filename: string;
  /** MIME type; pinned into the presigned PUT and echoed by the browser. */
  contentType: string;
  /** Server-chosen key prefix (e.g. "news"). Never taken from client input. */
  prefix: string;
};

export type PresignedUpload = {
  /** Presigned S3 PUT URL the browser uploads to directly. */
  uploadUrl: string;
  /** The object key persisted alongside the row (`<prefix>/<ISO>-<name>`). */
  key: string;
  /** Public CDN/S3 URL persisted as `imageUrl`. */
  publicUrl: string;
  /**
   * Headers the browser MUST send on its PUT so the signature matches — always
   * `Content-Type`, plus `x-amz-acl` when the bucket still requires object ACLs.
   */
  requiredHeaders: Record<string, string>;
};

export type StoragePort = {
  presignUpload(params: PresignUploadParams): Promise<PresignedUpload>;
  deleteObject(key: string): Promise<void>;
};

// Reduce a raw upload filename to a safe object-key segment: drop any path
// component, transliterate away diacritics, and keep only [A-Za-z0-9._-].
// Never build an S3 key straight from client input (gotcha #5).
export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "";
  const cleaned = base
    .normalize("NFKD")
    // strip combining marks left by NFKD decomposition
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return cleaned || "file";
}

// Legacy key shape preserved: `<prefix>/<ISO-timestamp>-<originalname>`.
// The timestamp is injected so callers (and tests) stay deterministic.
export function buildObjectKey(
  prefix: string,
  filename: string,
  now: Date,
): string {
  return `${prefix}/${now.toISOString()}-${sanitizeFilename(filename)}`;
}

export function buildPublicUrl(publicHost: string, key: string): string {
  return `https://${publicHost}/${key}`;
}
