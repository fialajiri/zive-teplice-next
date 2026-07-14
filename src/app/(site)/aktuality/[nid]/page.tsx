import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { container } from "@/server/container";
import { getNews } from "@/server/application/news";
import { RichText } from "@/components/site/rich-text";
import { formatCzechDate } from "@/lib/dates";
import { htmlToExcerpt } from "@/lib/html";

// Always server-rendered so admin changes appear immediately (no ISR window).
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/aktuality/[nid]">): Promise<Metadata> {
  const { nid } = await params;
  const result = await getNews(container.newsRepository, nid);
  if (!result.ok) return { title: "Aktualita nenalezena" };
  const news = result.value;
  const description = news.message ? htmlToExcerpt(news.message) : news.title;
  return {
    title: news.title,
    description,
    openGraph: news.image
      ? { title: news.title, description, images: [news.image.imageUrl] }
      : { title: news.title, description },
  };
}

export default async function NewsDetailPage({
  params,
}: PageProps<"/aktuality/[nid]">) {
  const { nid } = await params;
  const result = await getNews(container.newsRepository, nid);
  if (!result.ok) {
    if (result.error.kind === "not_found") notFound();
    throw new Error(result.error.message);
  }
  const news = result.value;

  return (
    <article className="mx-auto max-w-3xl">
      <Link
        href="/aktuality"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Zpět na aktuality
      </Link>
      <header className="mt-4 mb-6 flex flex-col gap-2">
        <time
          dateTime={news.createdAt}
          className="text-muted-foreground text-sm"
        >
          {formatCzechDate(news.createdAt)}
        </time>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {news.title}
        </h1>
      </header>
      {news.image ? (
        <div className="bg-muted relative mb-8 aspect-[16/9] overflow-hidden rounded-xl">
          <Image
            src={news.image.imageUrl}
            alt=""
            fill
            sizes="(min-width: 768px) 768px, 100vw"
            className="object-cover"
            priority
          />
        </div>
      ) : null}
      {news.message ? <RichText html={news.message} /> : null}
    </article>
  );
}
