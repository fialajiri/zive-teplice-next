import Image from "next/image";
import Link from "next/link";
import type { GalleryDto } from "@/server/domain/gallery";

export function GalleryCard({ gallery }: { gallery: GalleryDto }) {
  const cover = gallery.featuredImage ?? gallery.images[0] ?? null;
  const count = gallery.images.length;

  return (
    <article className="border-border/60 bg-card group overflow-hidden rounded-xl border">
      <Link href={`/galerie/${gallery.id}`} className="block">
        <div className="bg-muted relative aspect-square overflow-hidden">
          {cover ? (
            <Image
              src={cover.imageUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 309px, (min-width: 640px) calc(50vw - 36px), calc(100vw - 48px)"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : null}
        </div>
        <div className="flex items-baseline justify-between gap-2 p-4">
          <h3 className="group-hover:text-primary font-medium transition-colors">
            {gallery.name ?? "Galerie"}
          </h3>
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {count} fotek
          </span>
        </div>
      </Link>
    </article>
  );
}
