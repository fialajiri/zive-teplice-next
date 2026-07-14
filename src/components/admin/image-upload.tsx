"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { UploadCloudIcon, XIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Client-side pre-checks (UX only — the presign route re-validates server-side).
// Kept inline to avoid pulling the Zod schema module into the client bundle.
const ACCEPTED_MIME = ["image/png", "image/jpeg", "image/jpg"];
const ACCEPT_ATTR = "image/png,image/jpeg";
const MAX_BYTES = 8 * 1024 * 1024;

export type UploadedImage = { imageUrl: string; imageKey: string };

type PresignedUpload = {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  requiredHeaders: Record<string, string>;
};

type ImageUploadProps = {
  id?: string;
  value: UploadedImage | null;
  onChange: (value: UploadedImage | null) => void;
  ariaInvalid?: boolean;
  ariaDescribedby?: string;
};

// PUT straight to S3 with the exact signed headers, reporting progress via XHR.
function putToS3(
  uploadUrl: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    for (const [name, val] of Object.entries(headers)) {
      xhr.setRequestHeader(name, val);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
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

export function ImageUpload({
  id,
  value,
  onChange,
  ariaInvalid,
  ariaDescribedby,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
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
    if (file.size > MAX_BYTES) {
      setStatus("error");
      setError("Obrázek je příliš velký (max 8 MB).");
      return;
    }

    setStatus("uploading");
    setProgress(0);
    setLocalPreview(URL.createObjectURL(file));

    try {
      const res = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix: "news",
          files: [
            {
              filename: file.name,
              contentType: file.type,
              size: file.size,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error("presign failed");

      const data: { uploads: PresignedUpload[] } = await res.json();
      const target = data.uploads?.[0];
      if (!target) throw new Error("no presigned url");

      await putToS3(
        target.uploadUrl,
        file,
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
            alt="Náhled obrázku aktuality"
            fill
            sizes="(min-width: 768px) 448px, 100vw"
            className="object-cover"
            unoptimized
          />
          {status === "uploading" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 text-white">
              <Loader2Icon className="size-6 animate-spin" />
              <span className="text-sm">Nahrávám… {progress}%</span>
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
          disabled={status === "uploading"}
          onClick={() => inputRef.current?.click()}
          className="w-full max-w-md justify-center border-dashed"
        >
          <UploadCloudIcon />
          Vybrat obrázek
        </Button>
      )}

      {preview && status !== "uploading" ? (
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
