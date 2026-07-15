import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PlusIcon, PencilIcon } from "lucide-react";
import { container } from "@/server/container";
import { listNewsPage } from "@/server/application/news";
import { formatCzechDate } from "@/lib/dates";
import { firstParam } from "@/lib/pagination";
import { buttonVariants } from "@/components/ui/button";
import { DeleteNewsButton } from "@/components/admin/delete-news-button";
import { AdminPagination } from "@/components/admin/admin-pagination";

export const metadata: Metadata = {
  title: "Aktuality — administrace",
};

const BASE_PATH = "/admin/aktuality";

export default async function AdminNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawPage = Number(firstParam(params.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const result = await listNewsPage(container.newsRepository, { page });
  const data = result.ok ? result.value : null;
  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Aktuality</h1>
        <Link href="/admin/aktuality/nova" className={buttonVariants()}>
          <PlusIcon />
          Nová aktualita
        </Link>
      </header>

      {data === null ? (
        <p className="text-destructive text-sm">
          Aktuality se nepodařilo načíst. Zkuste to prosím později.
        </p>
      ) : data.total === 0 ? (
        <p className="text-muted-foreground text-sm">
          Zatím zde nejsou žádné aktuality. Vytvořte první.
        </p>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {data.total} {data.total === 1 ? "aktualita" : "aktualit"} celkem
          </p>
          <div className="border-border/60 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-border/60 text-muted-foreground border-b text-left">
                  <th className="w-20 px-4 py-3 font-medium">Obrázek</th>
                  <th className="px-4 py-3 font-medium">Titulek</th>
                  <th className="w-36 px-4 py-3 font-medium">Datum</th>
                  <th className="w-40 px-4 py-3 text-right font-medium">
                    Akce
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-border/40 border-b last:border-0"
                  >
                    <td className="px-4 py-3">
                      {item.image ? (
                        <div className="bg-muted relative h-10 w-16 overflow-hidden rounded">
                          <Image
                            src={item.image.imageUrl}
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
                    <td className="px-4 py-3 font-medium">{item.title}</td>
                    <td className="text-muted-foreground px-4 py-3">
                      {formatCzechDate(item.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/aktuality/${item.id}/upravit`}
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          })}
                        >
                          <PencilIcon />
                          Upravit
                        </Link>
                        <DeleteNewsButton id={item.id} title={item.title} />
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
