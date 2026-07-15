import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PlusIcon, SettingsIcon } from "lucide-react";
import { container } from "@/server/container";
import { listGalleriesPage } from "@/server/application/gallery";
import { firstParam } from "@/lib/pagination";
import { buttonVariants } from "@/components/ui/button";
import { DeleteGalleryButton } from "@/components/admin/delete-gallery-button";
import { AdminPagination } from "@/components/admin/admin-pagination";

export const metadata: Metadata = {
  title: "Galerie — administrace",
};

const BASE_PATH = "/admin/galerie";

export default async function AdminGalleriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawPage = Number(firstParam(params.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const result = await listGalleriesPage(container.galleryRepository, { page });
  const data = result.ok ? result.value : null;
  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Galerie</h1>
        <Link href="/admin/galerie/nova" className={buttonVariants()}>
          <PlusIcon />
          Nová galerie
        </Link>
      </header>

      {data === null ? (
        <p className="text-destructive text-sm">
          Galerie se nepodařilo načíst. Zkuste to prosím později.
        </p>
      ) : data.total === 0 ? (
        <p className="text-muted-foreground text-sm">
          Zatím zde nejsou žádné galerie. Vytvořte první.
        </p>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {data.total} {data.total === 1 ? "galerie" : "galerií"} celkem
          </p>
          <div className="border-border/60 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-border/60 text-muted-foreground border-b text-left">
                  <th className="w-20 px-4 py-3 font-medium">Náhled</th>
                  <th className="px-4 py-3 font-medium">Název</th>
                  <th className="w-24 px-4 py-3 font-medium">Fotek</th>
                  <th className="w-44 px-4 py-3 text-right font-medium">
                    Akce
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((gallery) => (
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
                        <div
                          className="bg-muted h-10 w-16 rounded"
                          aria-hidden
                        />
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
          <AdminPagination
            page={page}
            totalPages={totalPages}
            basePath={BASE_PATH}
          />
        </>
      )}
    </div>
  );
}
