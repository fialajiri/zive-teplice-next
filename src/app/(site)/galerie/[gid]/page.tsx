import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { container } from "@/server/container";
import { getGallery } from "@/server/application/gallery";
import { PageHeader } from "@/components/site/page-header";
import { GalleryLightbox } from "@/components/site/gallery-lightbox";

// Always server-rendered so admin changes appear immediately (no ISR window).
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/galerie/[gid]">): Promise<Metadata> {
  const { gid } = await params;
  const result = await getGallery(container.galleryRepository, gid);
  if (!result.ok) return { title: "Galerie nenalezena" };
  const gallery = result.value;
  const name = gallery.name ?? "Galerie";
  const description = `Fotogalerie ${name} — ${gallery.images.length} fotek z akce Živé Teplice.`;
  const cover = gallery.featuredImage ?? gallery.images[0] ?? null;
  return {
    title: name,
    description,
    openGraph: cover
      ? { title: name, description, images: [cover.imageUrl] }
      : { title: name, description },
  };
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
        <GalleryLightbox
          images={gallery.images}
          galleryName={gallery.name ?? "Galerie"}
        />
      )}
    </>
  );
}
