import { canvasToBlob } from "@/components/admin/image-compression";

export type CropPixels = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// Draws the user-selected crop rectangle onto a canvas and returns it as a JPEG
// Blob. `imageUrl` is expected to be an object URL (from URL.createObjectURL),
// which `fetch` can read back as a Blob to decode with EXIF-correct orientation —
// same technique as image-compression.ts's compressImage.
export async function getCroppedImageBlob(
  imageUrl: string,
  crop: CropPixels,
): Promise<Blob> {
  const response = await fetch(imageUrl);
  const sourceBlob = await response.blob();
  const bitmap = await createImageBitmap(sourceBlob, {
    imageOrientation: "from-image",
  });

  try {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(crop.width));
    canvas.height = Math.max(1, Math.round(crop.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable.");

    ctx.drawImage(
      bitmap,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const blob = await canvasToBlob(canvas, 0.92);
    if (!blob) throw new Error("Cropped image encode failed.");
    return blob;
  } finally {
    bitmap.close();
  }
}
