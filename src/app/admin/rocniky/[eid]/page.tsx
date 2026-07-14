import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { container } from "@/server/container";
import { getEvent } from "@/server/application/events";
import { EventForm } from "@/components/admin/event-form";
import { EventProgramForm } from "@/components/admin/event-program-form";
import { DeleteEventButton } from "@/components/admin/delete-event-button";

export const metadata: Metadata = {
  title: "Úprava ročníku — administrace",
};

export default async function EditEventPage({
  params,
}: PageProps<"/admin/rocniky/[eid]">) {
  const { eid } = await params;
  const result = await getEvent(container.eventRepository, eid);
  if (!result.ok) {
    if (result.error.kind === "not_found") notFound();
    throw new Error(result.error.message);
  }
  const event = result.value;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link
          href="/admin/rocniky"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Zpět na ročníky
        </Link>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            {event.title}
          </h1>
          <DeleteEventButton
            id={event.id}
            title={event.title}
            redirectTo="/admin/rocniky"
          />
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Údaje ročníku</h2>
        <EventForm
          mode="edit"
          eventId={event.id}
          initial={{ title: event.title, year: event.year }}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">
          Program {event.program ? "" : "(zatím nevytvořen)"}
        </h2>
        <EventProgramForm eventId={event.id} program={event.program} />
      </section>
    </div>
  );
}
