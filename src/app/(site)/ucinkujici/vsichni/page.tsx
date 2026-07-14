import type { Metadata } from "next";
import Link from "next/link";
import { container } from "@/server/container";
import { searchPerformers } from "@/server/application/performers";
import { PageHeader } from "@/components/site/page-header";
import { PerformerSearchForm } from "@/components/site/performer-search-form";
import { PerformerResults } from "@/components/site/performer-results";

// Always server-rendered so admin changes appear immediately (no ISR window).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Všichni účinkující",
  description: "Všichni účinkující, kteří kdy vystupovali na Živých Teplicích.",
};

const BASE_PATH = "/ucinkujici/vsichni";

type SearchParams = { q?: string | string[]; page?: string | string[] };

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AllPerformersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = firstParam(params.q)?.trim() ?? "";
  const rawPage = Number(firstParam(params.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const result = await searchPerformers(container.performerRepository, {
    query,
    page,
  });
  const data = result.ok ? result.value : null;

  return (
    <>
      <Link
        href="/ucinkujici"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Zpět na aktuální účinkující
      </Link>
      <div className="mt-4">
        <PageHeader
          title="Všichni účinkující"
          description="Všichni účinkující, kteří kdy vystupovali na Živých Teplicích."
        />
      </div>
      <PerformerSearchForm basePath={BASE_PATH} initialQuery={query} />
      <PerformerResults
        data={data}
        query={query}
        basePath={BASE_PATH}
        emptyMessage="Zatím zde nejsou žádní účinkující."
      />
    </>
  );
}
