import type { Metadata } from "next";
import { container } from "@/server/container";
import { listPerformers } from "@/server/application/performers";
import { PageHeader } from "@/components/site/page-header";
import { PerformerCard } from "@/components/site/performer-card";
import type { PerformerDto } from "@/server/domain/performer";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Účinkující",
  description: "Umělci a prodejci na akci Živé Teplice.",
};

function PerformerSection({
  heading,
  performers,
}: {
  heading: string;
  performers: PerformerDto[];
}) {
  if (performers.length === 0) return null;
  return (
    <section aria-labelledby={`heading-${heading}`}>
      <h2 id={`heading-${heading}`} className="mb-6 text-2xl font-semibold">
        {heading}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {performers.map((performer) => (
          <PerformerCard key={performer.id} performer={performer} />
        ))}
      </div>
    </section>
  );
}

export default async function PerformersPage() {
  const result = await listPerformers(container.performerRepository);
  const performers = result.ok ? result.value : null;

  const artists = performers?.filter((p) => p.type === "umělec") ?? [];
  const vendors = performers?.filter((p) => p.type === "prodejce") ?? [];

  return (
    <>
      <PageHeader
        title="Účinkující"
        description="Umělci a prodejci, kteří vystupují na akci Živé Teplice."
      />
      {performers === null ? (
        <p className="text-muted-foreground">
          Účinkující se momentálně nepodařilo načíst. Zkuste to prosím později.
        </p>
      ) : performers.length === 0 ? (
        <p className="text-muted-foreground">
          Zatím zde nejsou žádní účinkující.
        </p>
      ) : (
        <div className="flex flex-col gap-12">
          <PerformerSection heading="Umělci" performers={artists} />
          <PerformerSection heading="Prodejci" performers={vendors} />
        </div>
      )}
    </>
  );
}
