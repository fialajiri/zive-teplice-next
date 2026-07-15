// Shared browser-side upload helpers used by both the single ImageUpload and the
// bulk BulkImageUpload components. No React, no server imports — pure client I/O
// against the presign route and S3.

// width/height are only populated for uncropped ("original") uploads — see
// ImageUpload's aspectRatio="original" mode.
export type UploadedImage = {
  imageUrl: string;
  imageKey: string;
  width?: number;
  height?: number;
};

export type PresignedUpload = {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  requiredHeaders: Record<string, string>;
};

// Client-side pre-checks (UX only — the presign route re-validates server-side).
// Kept inline to avoid pulling the Zod schema module into the client bundle.
export const ACCEPTED_MIME = ["image/png", "image/jpeg", "image/jpg"];
export const ACCEPT_ATTR = "image/png,image/jpeg";
// Ceiling for what the server will PUT — applies to the COMPRESSED result, which
// we downscale well under this before uploading.
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
// Ceiling for the ORIGINAL a user may select; photographer files run large, and
// we compress client-side before the presigned upload (see image-compression.ts).
export const MAX_ORIGINAL_BYTES = 35 * 1024 * 1024;

// Accept a large original for selection; it is compressed before upload.
export function isAcceptableOriginal(file: File): boolean {
  return ACCEPTED_MIME.includes(file.type) && file.size <= MAX_ORIGINAL_BYTES;
}

// Request presigned PUT URLs for a batch of files under one server-controlled prefix.
export async function requestPresign(
  prefix: string,
  files: File[],
): Promise<PresignedUpload[]> {
  const res = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prefix,
      files: files.map((file) => ({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      })),
    }),
  });
  if (!res.ok) throw new Error("presign failed");
  const data: { uploads: PresignedUpload[] } = await res.json();
  if (!data.uploads?.length) throw new Error("no presigned urls");
  return data.uploads;
}

// PUT one file straight to S3 with the exact signed headers, reporting progress via XHR.
export function putToS3(
  uploadUrl: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    for (const [name, val] of Object.entries(headers)) {
      xhr.setRequestHeader(name, val);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`S3 PUT failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

// Run async tasks with a bounded number in flight at once. Preserves input order in
// the returned results and never rejects — each slot resolves to its task's outcome.
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function runSlot(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }

  const slots = Array.from({ length: Math.min(limit, items.length) }, runSlot);
  await Promise.all(slots);
  return results;
}
