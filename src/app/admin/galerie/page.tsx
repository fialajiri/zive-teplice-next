import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PlusIcon, SettingsIcon } from "lucide-react";
import { container } from "@/server/container";
import { listGalleries } from "@/server/application/gallery";
import { buttonVariants } from "@/components/ui/button";
import { DeleteGalleryButton } from "@/components/admin/delete-gallery-button";

export const metadata: Metadata = {
  title: "Galerie — administrace",
};

export default async function AdminGalleriesPage() {
  const result = await listGalleries(container.galleryRepository);
  const galleries = result.ok ? result.value : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Galerie</h1>
        <Link href="/admin/galerie/nova" className={buttonVariants()}>
          <PlusIcon />
          Nová galerie
        </Link>
      </header>

      {galleries === null ? (
        <p className="text-destructive text-sm">
          Galerie se nepodařilo načíst. Zkuste to prosím později.
        </p>
      ) : galleries.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Zatím zde nejsou žádné galerie. Vytvořte první.
        </p>
      ) : (
        <div className="border-border/60 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-border/60 text-muted-foreground border-b text-left">
                <th className="w-20 px-4 py-3 font-medium">Náhled</th>
                <th className="px-4 py-3 font-medium">Název</th>
                <th className="w-24 px-4 py-3 font-medium">Fotek</th>
                <th className="w-44 px-4 py-3 text-right font-medium">Akce</th>
              </tr>
            </thead>
            <tbody>
              {galleries.map((gallery) => (
                <tr
                  key={gallery.id}
                  className="border-border/40 border-b last:border-0"
                >
                  <td className="px-4 py-3">
                    {gallery.featuredImage ? (
                      <div className="bg-muted relative h-10 w-16 overflow-hidden rounded">
                        <Image
                          src={gallery.featuredImage.imageUrl}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="bg-muted h-10 w-16 rounded" aria-hidden />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {gallery.name ?? "Bez názvu"}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {gallery.images.length}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/galerie/${gallery.id}`}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                      >
                        <SettingsIcon />
                        Spravovat
                      </Link>
                      <DeleteGalleryButton
                        id={gallery.id}
                        name={gallery.name ?? "Bez názvu"}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
