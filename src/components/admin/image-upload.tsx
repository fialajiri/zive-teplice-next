"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { UploadCloudIcon, XIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ACCEPT_ATTR,
  ACCEPTED_MIME,
  MAX_ORIGINAL_BYTES,
  putToS3,
  requestPresign,
  type UploadedImage,
} from "@/components/admin/upload-client";
import { compressImage } from "@/components/admin/image-compression";
import {
  getCroppedImageBlob,
  type CropPixels,
} from "@/components/admin/image-crop";
import { ImageCropDialog } from "@/components/admin/image-crop-dialog";

export type { UploadedImage };

type UploadPrefix =
  | "news"
  | "gallery"
  | "program"
  | "performer"
  | "homepageHero"
  | "homepageAbout";

type ImageUploadProps = {
  id?: string;
  value: UploadedImage | null;
  onChange: (value: UploadedImage | null) => void;
  /** Server-controlled destination prefix (defaults to "news"). */
  prefix?: UploadPrefix;
  /** Width/height ratio of where this image is actually displayed (e.g. 4/3 for
   * performer cards, 16/9 for news, 1 for gallery covers) — the crop dialog and
   * preview box are constrained to this so what you crop is what you get.
   * Pass "original" to skip cropping entirely (e.g. flyers/posters that must be
   * shown in full) — the image's real width/height is captured instead and
   * reported back via onChange. */
  aspectRatio: number | "original";
  /** Accessible label for the preview image (defaults to a generic caption). */
  alt?: string;
  ariaInvalid?: boolean;
  ariaDescribedby?: string;
};

export function ImageUpload({
  id,
  value,
  onChange,
  prefix = "news",
  aspectRatio,
  alt = "Náhled nahraného obrázku",
  ariaInvalid,
  ariaDescribedby,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<
    "idle" | "compressing" | "uploading" | "error"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Local object-URL preview while uploading; falls back to the stored public URL.
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  // Object URL + original filename awaiting a crop decision, before any upload starts.
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>("photo.jpg");

  const preview = localPreview ?? value?.imageUrl ?? null;

  async function uploadFile(file: File) {
    setProgress(0);
    setLocalPreview(URL.createObjectURL(file));

    try {
      // Compress in the browser first (big originals → web-sized), then upload.
      setStatus("compressing");
      const compressed = await compressImage(file);

      // "original" mode never crops — record the final (post-compression) pixel
      // dimensions so the public page can size an exact-aspect-ratio container.
      let dimensions: { width: number; height: number } | undefined;
      if (aspectRatio === "original") {
        const bitmap = await createImageBitmap(compressed);
        dimensions = { width: bitmap.width, height: bitmap.height };
        bitmap.close();
      }

      setStatus("uploading");
      const [target] = await requestPresign(prefix, [compressed]);

      await putToS3(
        target.uploadUrl,
        compressed,
        target.requiredHeaders,
        setProgress,
      );

      onChange({
        imageUrl: target.publicUrl,
        imageKey: target.key,
        ...dimensions,
      });
      setStatus("idle");
    } catch {
      setStatus("error");
      setError("Nahrání obrázku se nezdařilo. Zkuste to prosím znovu.");
      setLocalPreview(null);
    }
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    setError(null);

    if (!ACCEPTED_MIME.includes(file.type)) {
      setStatus("error");
      setError("Povolené jsou pouze obrázky PNG nebo JPG.");
      return;
    }
    if (file.size > MAX_ORIGINAL_BYTES) {
      setStatus("error");
      setError("Obrázek je příliš velký (max 35 MB).");
      return;
    }

    // "original" mode skips cropping entirely — straight to compress + upload,
    // same as BulkImageUpload's crop-free flow.
    if (aspectRatio === "original") {
      void uploadFile(file);
      return;
    }

    // Open the crop dialog first — nothing is compressed/uploaded until confirmed.
    setPendingFileName(file.name);
    setCropSrc(URL.createObjectURL(file));
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  async function handleCropConfirm(crop: CropPixels) {
    const src = cropSrc;
    if (!src) return;
    setCropSrc(null);

    try {
      const blob = await getCroppedImageBlob(src, crop);
      const croppedFile = new File([blob], pendingFileName, {
        type: "image/jpeg",
      });
      await uploadFile(croppedFile);
    } catch {
      setStatus("error");
      setError("Oříznutí obrázku se nezdařilo. Zkuste to prosím znovu.");
    } finally {
      URL.revokeObjectURL(src);
    }
  }

  function handleRemove() {
    setLocalPreview(null);
    onChange(null);
    setStatus("idle");
    setError(null);
  }

  const describedBy =
    [ariaDescribedby, error ? `${id ?? "image"}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACCEPT_ATTR}
        onChange={handleChange}
        className="sr-only"
        aria-invalid={ariaInvalid || undefined}
        aria-describedby={describedBy}
      />

      {cropSrc && typeof aspectRatio === "number" ? (
        <ImageCropDialog
          imageUrl={cropSrc}
          aspectRatio={aspectRatio}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      ) : null}

      {preview ? (
        <div
          className={cn(
            "border-input relative w-full max-w-md overflow-hidden rounded-lg border",
            aspectRatio === "original" && "h-80",
          )}
          style={typeof aspectRatio === "number" ? { aspectRatio } : undefined}
        >
          {/* Unoptimized: local blob previews and just-uploaded objects aren't served through next/image. */}
          <Image
            src={preview}
            alt={alt}
            fill
            sizes="(min-width: 768px) 448px, 100vw"
            className={
              aspectRatio === "original" ? "object-contain" : "object-cover"
            }
            unoptimized
          />
          {status === "compressing" || status === "uploading" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 text-white">
              <Loader2Icon className="size-6 animate-spin" />
              <span className="text-sm">
                {status === "compressing"
                  ? "Zpracovávám…"
                  : `Nahrávám… ${progress}%`}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Odebrat obrázek"
              className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={status === "uploading" || status === "compressing"}
          onClick={() => inputRef.current?.click()}
          className="w-full max-w-md justify-center border-dashed"
        >
          <UploadCloudIcon />
          Vybrat obrázek
        </Button>
      )}

      {preview && status !== "uploading" && status !== "compressing" ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="self-start"
        >
          Nahradit obrázek
        </Button>
      ) : null}

      {error ? (
        <p
          id={`${id ?? "image"}-error`}
          role="alert"
          className={cn("text-destructive text-sm")}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
