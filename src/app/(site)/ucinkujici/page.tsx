import type { Metadata } from "next";
import Link from "next/link";
import { container } from "@/server/container";
import { searchPerformers } from "@/server/application/performers";
import { firstParam } from "@/lib/pagination";
import { PageHeader } from "@/components/site/page-header";
import { PerformerSearchForm } from "@/components/site/performer-search-form";
import { PerformerResults } from "@/components/site/performer-results";

// Always server-rendered so admin changes appear immediately (no ISR window).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Účinkující",
  description: "Účinkující na aktuálním ročníku Živé Teplice.",
};

const BASE_PATH = "/ucinkujici";

type SearchParams = { q?: string | string[]; page?: string | string[] };

export default async function PerformersPage({
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
    onlyApproved: true,
    page,
  });
  const data = result.ok ? result.value : null;

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Účinkující"
          description="Účinkující, kteří vystupují na aktuálním ročníku Živé Teplice."
        />
        <Link
          href="/ucinkujici/vsichni"
          className="text-primary shrink-0 text-sm hover:underline"
        >
          Všichni účinkující
        </Link>
      </div>
      <PerformerSearchForm basePath={BASE_PATH} initialQuery={query} />
      <PerformerResults
        data={data}
        query={query}
        basePath={BASE_PATH}
        emptyMessage="Zatím nejsou schváleni žádní účinkující pro aktuální ročník."
      />
    </>
  );
}
