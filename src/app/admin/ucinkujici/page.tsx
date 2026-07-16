import type { Metadata } from "next";
import { FileSpreadsheetIcon } from "lucide-react";
import { container } from "@/server/container";
import { searchPerformersForAdmin } from "@/server/application/participation";
import { firstParam } from "@/lib/pagination";
import { isParticipationStatus } from "@/lib/participation-status";
import { PerformerRow } from "@/components/admin/performer-row";
import { AdminSearchForm } from "@/components/admin/admin-search-form";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminStatusFilter } from "@/components/admin/admin-status-filter";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Účinkující — administrace",
};

const BASE_PATH = "/admin/ucinkujici";

export default async function AdminPerformersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    page?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const query = firstParam(params.q)?.trim() ?? "";
  const rawStatus = firstParam(params.status);
  const status = isParticipationStatus(rawStatus) ? rawStatus : undefined;
  const rawPage = Number(firstParam(params.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const result = await searchPerformersForAdmin(container.performerRepository, {
    query,
    status,
    page,
  });
  const data = result.ok ? result.value : null;
  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  const exportParams = new URLSearchParams();
  if (query) exportParams.set("q", query);
  if (status) exportParams.set("status", status);
  const exportQs = exportParams.toString();
  const exportHref = `/api/admin/ucinkujici/export${exportQs ? `?${exportQs}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Účinkující</h1>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href={exportHref} />}
        >
          <FileSpreadsheetIcon />
          Export do Excelu
        </Button>
      </header>

      <AdminSearchForm
        basePath={BASE_PATH}
        initialQuery={query}
        placeholder="Hledat podle jména nebo e-mailu…"
        label="Hledat účinkujícího podle jména nebo e-mailu"
      />

      {data === null ? (
        <p className="text-destructive text-sm">
          Účinkující se nepodařilo načíst. Zkuste to prosím později.
        </p>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {data.total} {data.total === 1 ? "účinkující" : "účinkujících"}{" "}
            celkem
          </p>
          <div className="border-border/60 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[50rem] table-fixed text-sm">
              <thead>
                <tr className="border-border/60 text-muted-foreground border-b text-left">
                  <th className="w-1/4 px-4 py-3 font-medium">Jméno</th>
                  <th className="w-1/4 px-4 py-3 font-medium">E-mail</th>
                  <th className="w-28 px-4 py-3 font-medium">
                    <AdminStatusFilter
                      basePath={BASE_PATH}
                      initialStatus={status ?? ""}
                      initialQuery={query}
                    />
                  </th>
                  <th className="w-28 px-4 py-3 font-medium">Ročník</th>
                  <th className="w-40 px-4 py-3 text-right font-medium">
                    Akce
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-muted-foreground px-4 py-6 text-center"
                    >
                      {query || status
                        ? "Nic nenalezeno pro zadané filtry."
                        : "Zatím zde nejsou žádní registrovaní účinkující."}
                    </td>
                  </tr>
                ) : (
                  data.items.map((performer) => (
                    <PerformerRow key={performer.id} performer={performer} />
                  ))
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination
            page={page}
            totalPages={totalPages}
            basePath={BASE_PATH}
            params={{ q: query, status }}
          />
        </>
      )}
    </div>
  );
}
