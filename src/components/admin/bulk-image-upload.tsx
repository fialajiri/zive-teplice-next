"use client";

import { useRef, useState } from "react";
import {
  UploadCloudIcon,
  Loader2Icon,
  CheckCircle2Icon,
  AlertCircleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ACCEPT_ATTR,
  isAcceptableOriginal,
  putToS3,
  requestPresign,
  runWithConcurrency,
  type UploadedImage,
} from "@/components/admin/upload-client";
import { compressImage } from "@/components/admin/image-compression";

// Bulk photo uploader: compress each photo in the browser, presign the compressed
// batch in one request, then PUT them to S3 with a small number in flight at once
// (gotcha #2). Partial failure is expected — the caller persists only what
// succeeded and can retry the rest (gotcha #3).
const MAX_FILES = 150;
const CONCURRENCY = 5;
// Compression decodes each image to a full bitmap (tens of MB of RAM for a big
// photo); throttle harder than uploads so a 150-file batch doesn't exhaust memory.
const COMPRESS_CONCURRENCY = 3;

type ItemStatus = "pending" | "compressing" | "uploading" | "done" | "error";

type Item = {
  file: File;
  previewUrl: string;
  status: ItemStatus;
  progress: number;
  result?: UploadedImage;
};

type BulkImageUploadProps = {
  /** Called after a run finishes, with the objects that uploaded successfully. */
  onComplete: (succeeded: UploadedImage[]) => Promise<void> | void;
  /** Disable interaction while the parent persists the batch. */
  busy?: boolean;
};

export function BulkImageUpload({ onComplete, busy }: BulkImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  // Batch compression progress: a count of how many photos have finished
  // compressing out of the total for this run (per-image compression can't report
  // sub-progress, but the batch count gives a real progress bar).
  const [compress, setCompress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });

  const uploadingCount = items.filter((i) => i.status === "uploading").length;
  const compressingCount = items.filter(
    (i) => i.status === "compressing",
  ).length;
  const doneCount = items.filter((i) => i.status === "done").length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const overallProgress =
    items.length === 0
      ? 0
      : Math.round(
          items.reduce(
            (sum, i) => sum + (i.status === "done" ? 100 : i.progress),
            0,
          ) / items.length,
        );
  const compressProgress =
    compress.total === 0
      ? 0
      : Math.round((compress.done / compress.total) * 100);
  const isCompressing = compressingCount > 0;

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setSelectionError(null);

    const incoming = Array.from(fileList).filter(isAcceptableOriginal);
    const rejected = fileList.length - incoming.length;

    setItems((prev) => {
      const room = MAX_FILES - prev.length;
      const accepted = incoming.slice(0, Math.max(0, room));
      if (incoming.length > accepted.length || rejected > 0) {
        setSelectionError(
          `Přidat lze nejvýše ${MAX_FILES} fotek (PNG/JPG do 35 MB). Některé soubory byly vynechány.`,
        );
      }
      const next: Item[] = accepted.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        status: "pending",
        progress: 0,
      }));
      return [...prev, ...next];
    });
  }

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  async function handleUpload() {
    // Only (re)upload the files that haven't succeeded yet — supports retry.
    const targets = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.status !== "done");
    if (targets.length === 0) return;

    setUploading(true);
    setSelectionError(null);
    setCompress({ done: 0, total: targets.length });
    for (const { index } of targets) {
      updateItem(index, { status: "pending", progress: 0 });
    }

    // Phase 1 — compress each original in the browser (throttled for memory). A
    // failed decode drops that item to "error" but never blocks the batch.
    const compressed = await runWithConcurrency(
      targets,
      COMPRESS_CONCURRENCY,
      async (target) => {
        const { index } = target;
        updateItem(index, { status: "compressing", progress: 0 });
        try {
          const file = await compressImage(target.item.file);
          return { target, file };
        } catch {
          updateItem(index, { status: "error", progress: 0 });
          return null;
        } finally {
          setCompress((prev) => ({ ...prev, done: prev.done + 1 }));
        }
      },
    );
    const ready = compressed.filter(
      (r): r is { target: { item: Item; index: number }; file: File } =>
        r !== null,
    );
    if (ready.length === 0) {
      setUploading(false);
      return;
    }

    // Collect successes locally (not from state): calling onComplete from inside a
    // setState updater would run it twice under React Strict Mode's double-invoke.
    const succeeded: UploadedImage[] = [];
    try {
      // Phase 2 — presign the COMPRESSED files (their sizes are what S3 validates).
      const presigned = await requestPresign(
        "gallery",
        ready.map((r) => r.file),
      );

      // Phase 3 — PUT each compressed file straight to S3.
      await runWithConcurrency(ready, CONCURRENCY, async (item, i) => {
        const upload = presigned[i];
        const { index } = item.target;
        updateItem(index, { status: "uploading", progress: 0 });
        try {
          await putToS3(
            upload.uploadUrl,
            item.file,
            upload.requiredHeaders,
            (percent) => updateItem(index, { progress: percent }),
          );
          updateItem(index, {
            status: "done",
            progress: 100,
            result: { imageUrl: upload.publicUrl, imageKey: upload.key },
          });
          succeeded.push({ imageUrl: upload.publicUrl, imageKey: upload.key });
        } catch {
          updateItem(index, { status: "error", progress: 0 });
        }
      });
    } catch {
      // Presign itself failed — mark the attempted batch as errored.
      for (const { target } of ready) {
        updateItem(target.index, { status: "error", progress: 0 });
      }
      setSelectionError("Nahrávání se nepodařilo připravit. Zkuste to znovu.");
      setUploading(false);
      return;
    }

    setUploading(false);

    // Persist exactly once, then drop the succeeded items (keep failures for retry).
    if (succeeded.length > 0) await onComplete(succeeded);
    setItems((current) => current.filter((i) => i.status === "error"));
  }

  function handleClear() {
    setItems([]);
    setSelectionError(null);
  }

  const disabled = uploading || busy;

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
        className="sr-only"
      />

      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="w-full justify-center border-dashed"
      >
        <UploadCloudIcon />
        Vybrat fotky (až {MAX_FILES})
      </Button>

      {selectionError ? (
        <p role="alert" className="text-destructive text-sm">
          {selectionError}
        </p>
      ) : null}

      {items.length > 0 ? (
        <>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">
              {items.length}{" "}
              {items.length === 1 ? "fotka vybrána" : "fotek vybráno"}
              {doneCount > 0 ? ` · ${doneCount} nahráno` : ""}
              {errorCount > 0 ? ` · ${errorCount} selhalo` : ""}
            </span>
            {uploading ? (
              <span className="text-muted-foreground">
                {isCompressing
                  ? `Zpracovávám… ${compress.done}/${compress.total}`
                  : `Nahrávám… ${overallProgress}% (${uploadingCount} probíhá)`}
              </span>
            ) : null}
          </div>

          {uploading ? (
            <div
              className="bg-muted h-2 w-full overflow-hidden rounded-full"
              role="progressbar"
              aria-valuenow={isCompressing ? compressProgress : overallProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={
                isCompressing
                  ? "Průběh zpracování fotek"
                  : "Celkový průběh nahrávání"
              }
            >
              <div
                className={cn(
                  "h-full transition-[width]",
                  isCompressing ? "bg-primary/60" : "bg-primary",
                )}
                style={{
                  width: `${isCompressing ? compressProgress : overallProgress}%`,
                }}
              />
            </div>
          ) : null}

          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {items.map((item, index) => (
              <li
                key={`${item.file.name}-${index}`}
                className="bg-muted relative aspect-square overflow-hidden rounded-md"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, never through next/image */}
                <img
                  src={item.previewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center",
                    (item.status === "uploading" ||
                      item.status === "compressing") &&
                      "bg-black/50 text-white",
                    item.status === "error" && "bg-destructive/70 text-white",
                  )}
                >
                  {item.status === "compressing" ? (
                    <Loader2Icon className="size-5 animate-spin text-white" />
                  ) : item.status === "uploading" ? (
                    <span className="text-xs font-medium">
                      {item.progress}%
                    </span>
                  ) : item.status === "done" ? (
                    <CheckCircle2Icon className="size-5 text-white drop-shadow" />
                  ) : item.status === "error" ? (
                    <AlertCircleIcon className="size-5" />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="lg"
              disabled={disabled}
              onClick={handleUpload}
            >
              {uploading ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  {compressingCount > 0 ? "Zpracovávám…" : "Nahrávám…"}
                </>
              ) : errorCount > 0 ? (
                "Zkusit znovu neúspěšné"
              ) : (
                "Nahrát fotky"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={disabled}
              onClick={handleClear}
            >
              Vyčistit
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
