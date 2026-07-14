import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { container } from "@/server/container";
import { getGallery } from "@/server/application/gallery";
import { PageHeader } from "@/components/site/page-header";

// Always server-rendered so admin changes appear immediately (no ISR window).
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/galerie/[gid]">): Promise<Metadata> {
  const { gid } = await params;
  const result = await getGallery(container.galleryRepository, gid);
  if (!result.ok) return { title: "Galerie nenalezena" };
  return { title: result.value.name ?? "Galerie" };
}

export default async function GalleryDetailPage({
  params,
}: PageProps<"/galerie/[gid]">) {
  const { gid } = await params;
  const result = await getGallery(container.galleryRepository, gid);
  if (!result.ok) {
    if (result.error.kind === "not_found") notFound();
    throw new Error(result.error.message);
  }
  const gallery = result.value;

  return (
    <>
      <Link
        href="/galerie"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Zpět na galerie
      </Link>
      <div className="mt-4">
        <PageHeader title={gallery.name ?? "Galerie"} />
      </div>
      {gallery.images.length === 0 ? (
        <p className="text-muted-foreground">
          Tato galerie zatím neobsahuje žádné fotografie.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {gallery.images.map((image, index) => (
            <li
              key={image.id ?? image.imageKey}
              className="bg-muted relative aspect-square overflow-hidden rounded-lg"
            >
              <Image
                src={image.imageUrl}
                alt={`${gallery.name ?? "Galerie"} — fotografie ${index + 1}`}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover"
                loading="lazy"
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
