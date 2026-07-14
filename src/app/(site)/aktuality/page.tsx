import type { Metadata } from "next";
import { container } from "@/server/container";
import { listNews } from "@/server/application/news";
import { PageHeader } from "@/components/site/page-header";
import { NewsCard } from "@/components/site/news-card";

// Always server-rendered so admin changes appear immediately (no ISR window).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aktuality",
  description: "Novinky a aktuality z akce Živé Teplice.",
};

export default async function NewsListPage() {
  const result = await listNews(container.newsRepository);
  const news = result.ok ? result.value : null;

  return (
    <>
      <PageHeader
        title="Aktuality"
        description="Novinky a informace z akce Živé Teplice."
      />
      {news === null ? (
        <p className="text-muted-foreground">
          Aktuality se momentálně nepodařilo načíst. Zkuste to prosím později.
        </p>
      ) : news.length === 0 ? (
        <p className="text-muted-foreground">
          Zatím zde nejsou žádné aktuality.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {news.map((item) => (
            <NewsCard key={item.id} news={item} />
          ))}
        </div>
      )}
    </>
  );
}
