import type { Metadata } from "next";
import Image from "next/image";
import { container } from "@/server/container";
import { getCurrentEvent } from "@/server/application/events";
import { PageHeader } from "@/components/site/page-header";
import { RichText } from "@/components/site/rich-text";

// Always server-rendered so admin changes appear immediately (no ISR window).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Program",
  description: "Program aktuálního ročníku akce Živé Teplice.",
};

export default async function ProgramPage() {
  const result = await getCurrentEvent(container.eventRepository);

  if (!result.ok) {
    return (
      <>
        <PageHeader title="Program" />
        <p className="text-muted-foreground">
          Program aktuálního ročníku zatím není k dispozici.
        </p>
      </>
    );
  }

  const event = result.value;
  const program = event.program;

  return (
    <>
      <PageHeader
        title="Program"
        description={`${event.title} · ${event.year}`}
      />
      {program ? (
        <article className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-2xl font-semibold">{program.title}</h2>
          {program.image ? (
            <div className="bg-muted relative mb-6 aspect-[16/9] overflow-hidden rounded-xl">
              <Image
                src={program.image.imageUrl}
                alt=""
                fill
                sizes="(min-width: 768px) 768px, 100vw"
                className="object-cover"
              />
            </div>
          ) : null}
          {program.message ? <RichText html={program.message} /> : null}
        </article>
      ) : (
        <p className="text-muted-foreground">
          Program tohoto ročníku bude brzy zveřejněn.
        </p>
      )}
    </>
  );
}
