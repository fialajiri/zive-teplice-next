"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// A single, uncropped image (real width/height known) that opens full-size in a
// lightbox on click — same Dialog-based pattern as GalleryLightbox, but for one
// standalone image instead of a gallery array. Both the thumbnail and the
// lightbox size via the image's real aspect ratio (non-fill next/image + CSS
// max-width/max-height), so tall or wide images scale down without cropping or
// leaving empty letterbox bars.
export function ImageLightbox({
  src,
  alt,
  width,
  height,
  className,
  priority,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  /** Set when the thumbnail renders above the fold (e.g. a page hero). */
  priority?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={cn("flex justify-center", className)}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="focus-visible:ring-ring/50 max-w-full cursor-pointer overflow-hidden rounded-xl outline-none focus-visible:ring-3"
        >
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            sizes="(min-width: 768px) 768px, 100vw"
            className="h-auto max-h-[80vh] w-auto max-w-full object-contain"
            priority={priority}
          />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[min(94vw,1100px)] border-none bg-neutral-950 p-2 text-neutral-50 sm:max-w-[min(94vw,1100px)] sm:p-2"
          showCloseButton
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <div className="flex justify-center">
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              sizes="94vw"
              className="h-auto max-h-[90vh] w-auto max-w-full object-contain"
              priority
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
