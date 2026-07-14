import type { Metadata } from "next";
import Link from "next/link";
import { container } from "@/server/container";
import { listCurrentYearNews } from "@/server/application/news";
import { PageHeader } from "@/components/site/page-header";
import { NewsCard } from "@/components/site/news-card";

// Always server-rendered so admin changes appear immediately (no ISR window).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aktuality",
  description: "Novinky a aktuality z akce Živé Teplice.",
};

export default async function NewsListPage() {
  const result = await listCurrentYearNews(
    container.newsRepository,
    container.eventRepository,
  );
  const news = result.ok ? result.value : null;

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Aktuality"
          description="Novinky a informace z aktuálního ročníku Živé Teplice."
        />
        <Link
          href="/aktuality/archiv"
          className="text-primary shrink-0 text-sm hover:underline"
        >
          Archiv aktualit
        </Link>
      </div>
      {news === null ? (
        <p className="text-muted-foreground">
          Aktuality se momentálně nepodařilo načíst. Zkuste to prosím později.
        </p>
      ) : news.length === 0 ? (
        <p className="text-muted-foreground">
          Zatím zde nejsou žádné aktuality.
        </p>
      ) : (
        <>
          <h2 className="sr-only">Seznam aktualit</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((item) => (
              <NewsCard key={item.id} news={item} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
