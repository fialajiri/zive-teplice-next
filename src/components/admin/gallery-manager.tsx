"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import {
  appendGalleryImagesAction,
  removeGalleryImageAction,
} from "@/server/actions/gallery";
import type { GalleryDto } from "@/server/domain/gallery";
import type { UploadedImage } from "@/components/admin/upload-client";
import { BulkImageUpload } from "@/components/admin/bulk-image-upload";
import { Button } from "@/components/ui/button";

export function GalleryManager({ gallery }: { gallery: GalleryDto }) {
  const router = useRouter();
  const [persisting, startPersist] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  function handleComplete(succeeded: UploadedImage[]) {
    if (succeeded.length === 0) return;
    startPersist(async () => {
      const result = await appendGalleryImagesAction(gallery.id, succeeded);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Nahráno ${succeeded.length} ${succeeded.length === 1 ? "fotka" : "fotek"}.`,
      );
      router.refresh();
    });
  }

  function handleRemove(imageId: string) {
    setRemovingId(imageId);
    startPersist(async () => {
      const result = await removeGalleryImageAction(gallery.id, imageId);
      setRemovingId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Fotka byla odstraněna.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Nahrát fotky</h2>
        <BulkImageUpload onComplete={handleComplete} busy={persisting} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          Fotky v galerii ({gallery.images.length})
        </h2>
        {gallery.images.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Zatím zde nejsou žádné fotky. Nahrajte je výše.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {gallery.images.map((image, index) => (
              <li
                key={image.id ?? image.imageKey}
                className="bg-muted group relative aspect-square overflow-hidden rounded-lg"
              >
                <Image
                  src={image.imageUrl}
                  alt={`Fotka ${index + 1}`}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover"
                />
                {image.id ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    disabled={persisting}
                    onClick={() => handleRemove(image.id as string)}
                    aria-label={`Odstranit fotku ${index + 1}`}
                    className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-100"
                  >
                    {removingId === image.id ? (
                      <span className="text-xs">…</span>
                    ) : (
                      <Trash2Icon className="size-4" />
                    )}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
