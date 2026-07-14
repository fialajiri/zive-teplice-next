import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon, PencilIcon } from "lucide-react";
import { container } from "@/server/container";
import { listEvents } from "@/server/application/events";
import { buttonVariants } from "@/components/ui/button";
import { DeleteEventButton } from "@/components/admin/delete-event-button";

export const metadata: Metadata = {
  title: "Ročníky — administrace",
};

export default async function AdminEventsPage() {
  const result = await listEvents(container.eventRepository);
  const events = result.ok ? result.value : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Ročníky</h1>
        <Link href="/admin/rocniky/novy" className={buttonVariants()}>
          <PlusIcon />
          Nový ročník
        </Link>
      </header>

      {events === null ? (
        <p className="text-destructive text-sm">
          Ročníky se nepodařilo načíst. Zkuste to prosím později.
        </p>
      ) : events.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Zatím zde nejsou žádné ročníky. Vytvořte první.
        </p>
      ) : (
        <div className="border-border/60 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-border/60 text-muted-foreground border-b text-left">
                <th className="px-4 py-3 font-medium">Název</th>
                <th className="w-24 px-4 py-3 font-medium">Rok</th>
                <th className="w-32 px-4 py-3 font-medium">Stav</th>
                <th className="w-44 px-4 py-3 text-right font-medium">Akce</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.id}
                  className="border-border/40 border-b last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{event.title}</td>
                  <td className="text-muted-foreground px-4 py-3">
                    {event.year}
                  </td>
                  <td className="px-4 py-3">
                    {event.current ? (
                      <span className="bg-primary/10 text-primary inline-flex rounded-full px-2 py-0.5 text-xs font-medium">
                        Aktuální
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        Archiv
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/rocniky/${event.id}`}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                      >
                        <PencilIcon />
                        Upravit
                      </Link>
                      <DeleteEventButton id={event.id} title={event.title} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
