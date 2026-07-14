import type { Metadata } from "next";
import { container } from "@/server/container";
import { listPerformersForAdmin } from "@/server/application/participation";
import type { ParticipationStatus } from "@/server/domain/performer";
import { ParticipationDecisionButtons } from "@/components/admin/participation-decision-buttons";

export const metadata: Metadata = {
  title: "Účinkující — administrace",
};

const STATUS_LABEL: Record<ParticipationStatus, string> = {
  notsend: "Nepodáno",
  pending: "Čeká",
  approved: "Schváleno",
  rejected: "Zamítnuto",
};

const STATUS_CLASS: Record<ParticipationStatus, string> = {
  notsend: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  approved:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

export default async function AdminPerformersPage() {
  const result = await listPerformersForAdmin(container.performerRepository);
  const performers = result.ok ? result.value : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Účinkující</h1>
      </header>

      {performers === null ? (
        <p className="text-destructive text-sm">
          Účinkující se nepodařilo načíst. Zkuste to prosím později.
        </p>
      ) : performers.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Zatím zde nejsou žádní registrovaní účinkující.
        </p>
      ) : (
        <div className="border-border/60 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-border/60 text-muted-foreground border-b text-left">
                <th className="px-4 py-3 font-medium">Jméno</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Telefon</th>
                <th className="w-28 px-4 py-3 font-medium">Účast</th>
                <th className="w-52 px-4 py-3 text-right font-medium">Akce</th>
              </tr>
            </thead>
            <tbody>
              {performers.map((performer) => (
                <tr
                  key={performer.id}
                  className="border-border/40 border-b last:border-0"
                >
                  <td className="px-4 py-3 font-medium">
                    {performer.username}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {performer.email}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {performer.phoneNumber}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[performer.request]}`}
                    >
                      {STATUS_LABEL[performer.request]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {performer.request === "pending" ? (
                      <ParticipationDecisionButtons
                        performerId={performer.id}
                        username={performer.username}
                      />
                    ) : (
                      <div className="text-muted-foreground text-right text-xs">
                        —
                      </div>
                    )}
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
