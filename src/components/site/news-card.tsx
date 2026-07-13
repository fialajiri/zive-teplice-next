import Image from "next/image";
import Link from "next/link";
import type { NewsDto } from "@/server/domain/news";
import { formatCzechDate } from "@/lib/dates";

export function NewsCard({ news }: { news: NewsDto }) {
  return (
    <article className="border-border/60 bg-card group overflow-hidden rounded-xl border">
      <Link href={`/aktuality/${news.id}`} className="block">
        {news.image ? (
          <div className="bg-muted relative aspect-[16/9] overflow-hidden">
            <Image
              src={news.image.imageUrl}
              alt=""
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        ) : null}
        <div className="flex flex-col gap-2 p-5">
          <time
            dateTime={news.createdAt}
            className="text-muted-foreground text-xs"
          >
            {formatCzechDate(news.createdAt)}
          </time>
          <h3 className="group-hover:text-primary text-lg font-semibold text-balance transition-colors">
            {news.title}
          </h3>
        </div>
      </Link>
    </article>
  );
}
