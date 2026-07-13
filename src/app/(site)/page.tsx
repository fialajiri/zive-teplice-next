import Link from "next/link";
import { container } from "@/server/container";
import { listNews } from "@/server/application/news";
import { getCurrentEvent } from "@/server/application/events";
import { NewsCard } from "@/components/site/news-card";
import { buttonVariants } from "@/components/ui/button";

export const revalidate = 60;

export default async function HomePage() {
  const [newsResult, eventResult] = await Promise.all([
    listNews(container.newsRepository),
    getCurrentEvent(container.eventRepository),
  ]);

  const latestNews = newsResult.ok ? newsResult.value.slice(0, 3) : [];
  const currentEvent = eventResult.ok ? eventResult.value : null;

  return (
    <div className="flex flex-col gap-16">
      <section className="flex flex-col items-start gap-5 py-8">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Živé Teplice
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg text-pretty">
          {currentEvent
            ? `Aktuální ročník: ${currentEvent.title} (${currentEvent.year}). Prohlédněte si program, aktuality a galerie.`
            : "Kulturní akce v Teplicích — aktuality, program, galerie a účinkující."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/program" className={buttonVariants()}>
            Program
          </Link>
          <Link
            href="/galerie"
            className={buttonVariants({ variant: "outline" })}
          >
            Galerie
          </Link>
        </div>
      </section>

      {latestNews.length > 0 ? (
        <section aria-labelledby="home-news-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="home-news-heading" className="text-2xl font-semibold">
              Nejnovější aktuality
            </h2>
            <Link
              href="/aktuality"
              className="text-primary text-sm hover:underline"
            >
              Všechny aktuality
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latestNews.map((news) => (
              <NewsCard key={news.id} news={news} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
