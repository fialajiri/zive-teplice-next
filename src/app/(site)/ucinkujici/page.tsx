import type { Metadata } from "next";
import { container } from "@/server/container";
import { listPerformers } from "@/server/application/performers";
import { PageHeader } from "@/components/site/page-header";
import { PerformerCard } from "@/components/site/performer-card";

// Always server-rendered so admin changes appear immediately (no ISR window).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Účinkující",
  description: "Účinkující na akci Živé Teplice.",
};

export default async function PerformersPage() {
  const result = await listPerformers(container.performerRepository);
  const performers = result.ok ? result.value : null;

  return (
    <>
      <PageHeader
        title="Účinkující"
        description="Účinkující, kteří vystupují na akci Živé Teplice."
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {performers.map((performer) => (
            <PerformerCard key={performer.id} performer={performer} />
          ))}
        </div>
      )}
    </>
  );
}
