import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { container } from "@/server/container";
import { listNewsForYear } from "@/server/application/news";
import { PageHeader } from "@/components/site/page-header";
import { NewsCard } from "@/components/site/news-card";

// Always server-rendered so admin changes appear immediately (no ISR window).
export const dynamic = "force-dynamic";

function parseYear(raw: string): number | null {
  if (!/^\d{4}$/.test(raw)) return null;
  return Number(raw);
}

export async function generateMetadata({
  params,
}: PageProps<"/aktuality/archiv/[year]">): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `Aktuality ${year}`,
    description: `Archivované aktuality z ročníku ${year} akce Živé Teplice.`,
  };
}

export default async function NewsArchiveYearPage({
  params,
}: PageProps<"/aktuality/archiv/[year]">) {
  const { year: rawYear } = await params;
  const year = parseYear(rawYear);
  if (year === null) notFound();

  const result = await listNewsForYear(container.newsRepository, year);
  const news = result.ok ? result.value : null;

  return (
    <>
      <Link
        href="/aktuality/archiv"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Zpět na archiv
      </Link>
      <div className="mt-4">
        <PageHeader title={`Aktuality ${year}`} />
      </div>
      {news === null ? (
        <p className="text-muted-foreground">
          Aktuality se momentálně nepodařilo načíst. Zkuste to prosím později.
        </p>
      ) : news.length === 0 ? (
        <p className="text-muted-foreground">
          Pro rok {year} zde nejsou žádné aktuality.
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
