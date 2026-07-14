import { z } from "zod";

// Allowed image types — matches legacy (`file-upload.js`) and next.config's
// remotePatterns. Kept as a readonly tuple so it doubles as a Zod enum.
export const ALLOWED_IMAGE_MIME = [
  "image/png",
  "image/jpg",
  "image/jpeg",
] as const;

// 8 MB: comfortably above real photos, well under legacy's 30 MB, and a plain
// direct-to-S3 PUT so Vercel's ~4.5 MB body limit never applies.
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// Server-controlled destinations. The client picks a known prefix from this list,
// never a raw path — the key prefix is constrained here, not built from input.
// Each prefix carries its own file-count cap (news = single image; gallery bulk
// arrives in Phase 4).
export const UPLOAD_MAX_FILES = {
  news: 1,
} as const;

export type UploadPrefix = keyof typeof UPLOAD_MAX_FILES;

const UPLOAD_PREFIXES = Object.keys(UPLOAD_MAX_FILES) as [
  UploadPrefix,
  ...UploadPrefix[],
];

const fileSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.enum(ALLOWED_IMAGE_MIME),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export const presignRequestSchema = z
  .object({
    prefix: z.enum(UPLOAD_PREFIXES),
    files: z.array(fileSchema).min(1),
  })
  .refine((body) => body.files.length <= UPLOAD_MAX_FILES[body.prefix], {
    error: "Too many files for this upload.",
    path: ["files"],
  });

export type PresignRequest = z.infer<typeof presignRequestSchema>;
