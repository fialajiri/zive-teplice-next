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

export type { UploadedImage };

type UploadPrefix = "news" | "gallery" | "program" | "performer";

type ImageUploadProps = {
  id?: string;
  value: UploadedImage | null;
  onChange: (value: UploadedImage | null) => void;
  /** Server-controlled destination prefix (defaults to "news"). */
  prefix?: UploadPrefix;
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

  const preview = localPreview ?? value?.imageUrl ?? null;

  async function handleFile(file: File) {
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

    setProgress(0);
    setLocalPreview(URL.createObjectURL(file));

    try {
      // Compress in the browser first (big originals → web-sized), then upload.
      setStatus("compressing");
      const compressed = await compressImage(file);

      setStatus("uploading");
      const [target] = await requestPresign(prefix, [compressed]);

      await putToS3(
        target.uploadUrl,
        compressed,
        target.requiredHeaders,
        setProgress,
      );

      onChange({ imageUrl: target.publicUrl, imageKey: target.key });
      setStatus("idle");
    } catch {
      setStatus("error");
      setError("Nahrání obrázku se nezdařilo. Zkuste to prosím znovu.");
      setLocalPreview(null);
    }
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void handleFile(file);
    // Allow re-selecting the same file.
    event.target.value = "";
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

      {preview ? (
        <div className="border-input relative aspect-[16/9] w-full max-w-md overflow-hidden rounded-lg border">
          {/* Unoptimized: local blob previews and just-uploaded objects aren't served through next/image. */}
          <Image
            src={preview}
            alt={alt}
            fill
            sizes="(min-width: 768px) 448px, 100vw"
            className="object-cover"
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
