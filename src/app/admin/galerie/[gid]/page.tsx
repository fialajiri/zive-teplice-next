import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { container } from "@/server/container";
import { getGallery } from "@/server/application/gallery";
import { GalleryManager } from "@/components/admin/gallery-manager";
import { DeleteGalleryButton } from "@/components/admin/delete-gallery-button";

export const metadata: Metadata = {
  title: "Správa galerie — administrace",
};

export default async function ManageGalleryPage({
  params,
}: PageProps<"/admin/galerie/[gid]">) {
  const { gid } = await params;
  const result = await getGallery(container.galleryRepository, gid);
  if (!result.ok) {
    if (result.error.kind === "not_found") notFound();
    throw new Error(result.error.message);
  }
  const gallery = result.value;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/galerie"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Zpět na galerie
        </Link>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            {gallery.name ?? "Bez názvu"}
          </h1>
          <DeleteGalleryButton
            id={gallery.id}
            name={gallery.name ?? "Bez názvu"}
            redirectTo="/admin/galerie"
          />
        </div>
      </div>
      <GalleryManager gallery={gallery} />
    </div>
  );
}
