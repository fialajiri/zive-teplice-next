"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { GalleryImageDto } from "@/server/domain/gallery";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function altFor(galleryName: string, index: number): string {
  return `${galleryName} — fotografie ${index + 1}`;
}

export function GalleryLightbox({
  images,
  galleryName,
}: {
  images: GalleryImageDto[];
  galleryName: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const total = images.length;

  function showPrevious() {
    setOpenIndex((i) => (i === null ? i : (i - 1 + total) % total));
  }

  function showNext() {
    setOpenIndex((i) => (i === null ? i : (i + 1) % total));
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      showNext();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPrevious();
    }
  }

  const current = openIndex === null ? null : images[openIndex];

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => (
          <li key={image.id ?? image.imageKey}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="focus-visible:ring-ring/50 bg-muted relative block aspect-square w-full cursor-pointer overflow-hidden rounded-lg outline-none focus-visible:ring-3"
            >
              <Image
                src={image.imageUrl}
                alt={altFor(galleryName, index)}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition-transform duration-300 hover:scale-105"
                loading="lazy"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog
        open={openIndex !== null}
        onOpenChange={(open) => {
          if (!open) setOpenIndex(null);
        }}
      >
        <DialogContent
          onKeyDown={handleKeyDown}
          className="max-w-[min(94vw,1100px)] border-none bg-neutral-950 p-2 text-neutral-50 sm:max-w-[min(94vw,1100px)] sm:p-2"
          showCloseButton
        >
          {current && openIndex !== null ? (
            <>
              <DialogTitle className="sr-only">
                {altFor(galleryName, openIndex)} ({openIndex + 1} z {total})
              </DialogTitle>
              <div className="relative aspect-[4/3] w-full sm:aspect-[16/10]">
                <Image
                  src={current.imageUrl}
                  alt={altFor(galleryName, openIndex)}
                  fill
                  sizes="94vw"
                  className="object-contain"
                  priority
                />
              </div>
              {total > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={showPrevious}
                    aria-label="Předchozí fotografie"
                    className={cn(
                      "absolute top-1/2 left-2 -translate-y-1/2 cursor-pointer rounded-full bg-black/40 p-2 text-white",
                      "hover:bg-black/60 focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none",
                    )}
                  >
                    <ChevronLeftIcon aria-hidden="true" className="size-6" />
                  </button>
                  <button
                    type="button"
                    onClick={showNext}
                    aria-label="Další fotografie"
                    className={cn(
                      "absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-full bg-black/40 p-2 text-white",
                      "hover:bg-black/60 focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none",
                    )}
                  >
                    <ChevronRightIcon aria-hidden="true" className="size-6" />
                  </button>
                  <p className="text-center text-sm text-neutral-300">
                    {openIndex + 1} / {total}
                  </p>
                </>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
