import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, CalendarIcon } from "lucide-react";
import { container } from "@/server/container";
import { listArchiveYears } from "@/server/application/news";
import { PageHeader } from "@/components/site/page-header";

// Always server-rendered so admin changes appear immediately (no ISR window).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Archiv aktualit",
  description: "Aktuality z předchozích ročníků Živé Teplice.",
};

export default async function NewsArchivePage() {
  const result = await listArchiveYears(
    container.newsRepository,
    container.eventRepository,
  );
  const years = result.ok ? result.value : null;

  return (
    <>
      <PageHeader
        title="Archiv aktualit"
        description="Aktuality z předchozích ročníků Živé Teplice."
      />
      {years === null ? (
        <p className="text-muted-foreground">
          Archiv se momentálně nepodařilo načíst. Zkuste to prosím později.
        </p>
      ) : years.length === 0 ? (
        <p className="text-muted-foreground">
          Archiv zatím neobsahuje žádné starší aktuality.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {years.map((year) => (
            <li key={year}>
              <Link
                href={`/aktuality/archiv/${year}`}
                className="border-border/60 bg-card group hover:border-primary/40 flex items-center justify-between gap-4 rounded-xl border p-5 transition-colors"
              >
                <span className="flex items-center gap-3">
                  <CalendarIcon
                    aria-hidden="true"
                    className="text-primary size-6"
                  />
                  <span className="font-heading text-2xl">{year}</span>
                </span>
                <ArrowRightIcon
                  aria-hidden="true"
                  className="text-muted-foreground group-hover:text-primary size-5 transition-transform group-hover:translate-x-1"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
