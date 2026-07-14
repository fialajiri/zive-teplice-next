import type { Metadata } from "next";
import Link from "next/link";
import { NewsForm } from "@/components/admin/news-form";

export const metadata: Metadata = {
  title: "Nová aktualita",
};

export default function NewNewsPage() {
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
          Nová aktualita
        </h1>
      </div>
      <NewsForm mode="create" />
    </div>
  );
}
