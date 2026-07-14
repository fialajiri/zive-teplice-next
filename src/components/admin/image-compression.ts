// Client-side image compression, run in the browser BEFORE the presigned S3 PUT.
// Photographers hand over 15–30 MB originals; we downscale + re-encode to a
// web-appropriate size (~2560px, a few MB) so the direct-to-S3 upload stays small,
// storage stays sane, and next/image no longer chokes on huge originals. Native
// Canvas APIs only — no dependency. Decode uses `imageOrientation: "from-image"`
// so EXIF-rotated phone/camera photos aren't drawn sideways.

export type CompressionOptions = {
  /** Longest edge of the output, in px. */
  maxDimension: number;
  /** Aim to keep the encoded file under this many bytes. */
  targetBytes: number;
  /** Initial JPEG quality (0–1); stepped down if the result overshoots. */
  quality: number;
};

export const DEFAULT_COMPRESSION: CompressionOptions = {
  maxDimension: 2560,
  targetBytes: 5 * 1024 * 1024,
  quality: 0.82,
};

const OUTPUT_MIME = "image/jpeg";

// Scale (w,h) so the longest edge is at most `maxDimension`, preserving aspect
// ratio. Images already within bounds are returned unchanged. Pure + unit-tested.
export function computeScaledDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxDimension) return { width, height };
  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

// Swap any extension for `.jpg` (we always re-encode to JPEG).
export function renameToJpeg(filename: string): string {
  const base = filename.replace(/\.[^./\\]+$/, "");
  return `${base || "photo"}.jpg`;
}

function supportsCompression(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof createImageBitmap === "function" &&
    typeof HTMLCanvasElement !== "undefined"
  );
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), OUTPUT_MIME, quality);
  });
}

// Compress one image file. Returns a new JPEG File; on any failure or unsupported
// browser it returns the original untouched (server-side size validation still
// applies, so an over-limit original simply surfaces as an upload error).
export async function compressImage(
  file: File,
  options: CompressionOptions = DEFAULT_COMPRESSION,
): Promise<File> {
  if (!supportsCompression()) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  try {
    const { width, height } = computeScaledDimensions(
      bitmap.width,
      bitmap.height,
      options.maxDimension,
    );

    // Already web-sized and small enough → keep the original bytes (no re-encode,
    // no quality loss).
    if (
      width === bitmap.width &&
      height === bitmap.height &&
      file.size <= options.targetBytes
    ) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // Flatten any transparency onto white so transparent PNGs don't encode to a
    // black background when converted to JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    let quality = options.quality;
    let blob = await canvasToBlob(canvas, quality);
    // A couple of step-downs if the encode still overshoots the target size.
    for (let i = 0; i < 2 && blob && blob.size > options.targetBytes; i++) {
      if (quality <= 0.5) break;
      quality = Math.max(0.5, quality - 0.12);
      blob = await canvasToBlob(canvas, quality);
    }
    if (!blob) return file;

    // If re-encoding somehow produced a larger file than the original, keep the
    // original (can happen for already-optimized small JPEGs).
    if (blob.size >= file.size && width === bitmap.width) return file;

    return new File([blob], renameToJpeg(file.name), {
      type: OUTPUT_MIME,
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}
