import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { container } from "@/server/container";
import { getNews } from "@/server/application/news";
import { NewsForm } from "@/components/admin/news-form";

export const metadata: Metadata = {
  title: "Upravit aktualitu",
};

export default async function EditNewsPage({
  params,
}: PageProps<"/admin/aktuality/[nid]/upravit">) {
  const { nid } = await params;
  const result = await getNews(container.newsRepository, nid);
  if (!result.ok) {
    if (result.error.kind === "not_found") notFound();
    throw new Error(result.error.message);
  }
  const news = result.value;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/aktuality"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Zpět na seznam
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Upravit aktualitu
        </h1>
      </div>
      <NewsForm
        mode="edit"
        newsId={news.id}
        initial={{
          title: news.title,
          message: news.message ?? "",
          image: news.image,
        }}
      />
    </div>
  );
}
