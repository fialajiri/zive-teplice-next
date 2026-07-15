import type { PerformerSearchPage } from "@/server/application/performers";
import { PerformerCard } from "@/components/site/performer-card";
import { pageHref as buildPageHref, pageWindow } from "@/lib/pagination";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

function pageHref(basePath: string, query: string, page: number): string {
  return buildPageHref(basePath, { q: query }, page);
}

export function PerformerResults({
  data,
  query,
  basePath,
  emptyMessage,
}: {
  data: PerformerSearchPage | null;
  query: string;
  basePath: string;
  emptyMessage: string;
}) {
  if (data === null) {
    return (
      <p className="text-muted-foreground">
        Účinkující se momentálně nepodařilo načíst. Zkuste to prosím později.
      </p>
    );
  }

  if (data.items.length === 0) {
    return (
      <p className="text-muted-foreground">
        {query ? `Nic nenalezeno pro „${query}“.` : emptyMessage}
      </p>
    );
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <>
      <h2 className="sr-only">Seznam účinkujících</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((performer) => (
          <PerformerCard key={performer.id} performer={performer} />
        ))}
      </div>

      {totalPages > 1 ? (
        <Pagination className="mt-10">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                text="Předchozí"
                href={pageHref(basePath, query, Math.max(1, data.page - 1))}
                aria-disabled={data.page <= 1}
                className={
                  data.page <= 1 ? "pointer-events-none opacity-50" : undefined
                }
              />
            </PaginationItem>
            {pageWindow(data.page, totalPages).map((entry, index) =>
              entry === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={entry}>
                  <PaginationLink
                    href={pageHref(basePath, query, entry)}
                    isActive={entry === data.page}
                  >
                    {entry}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                text="Další"
                href={pageHref(
                  basePath,
                  query,
                  Math.min(totalPages, data.page + 1),
                )}
                aria-disabled={data.page >= totalPages}
                className={
                  data.page >= totalPages
                    ? "pointer-events-none opacity-50"
                    : undefined
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </>
  );
}
