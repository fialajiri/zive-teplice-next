import type { Metadata } from "next";
import { container } from "@/server/container";
import { listGalleries } from "@/server/application/gallery";
import { PageHeader } from "@/components/site/page-header";
import { GalleryCard } from "@/components/site/gallery-card";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Galerie",
  description: "Fotogalerie z akcí Živé Teplice.",
};

export default async function GalleryListPage() {
  const result = await listGalleries(container.galleryRepository);
  const galleries = result.ok ? result.value : null;

  return (
    <>
      <PageHeader
        title="Galerie"
        description="Fotogalerie z uplynulých ročníků."
      />
      {galleries === null ? (
        <p className="text-muted-foreground">
          Galerie se momentálně nepodařilo načíst. Zkuste to prosím později.
        </p>
      ) : galleries.length === 0 ? (
        <p className="text-muted-foreground">Zatím zde nejsou žádné galerie.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {galleries.map((gallery) => (
            <GalleryCard key={gallery.id} gallery={gallery} />
          ))}
        </div>
      )}
    </>
  );
}
