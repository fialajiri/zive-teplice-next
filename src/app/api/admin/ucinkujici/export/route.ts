import ExcelJS from "exceljs";
import { container } from "@/server/container";
import { requireAdmin } from "@/server/actions/guards";
import { listPerformersForAdminExport } from "@/server/application/participation";
import {
  PARTICIPATION_STATUS_LABEL,
  isParticipationStatus,
} from "@/lib/participation-status";

// GET /api/admin/ucinkujici/export?q=&status= — Node runtime (default; exceljs
// needs Node Buffer APIs). Admin-only. Exports every performer matching the
// current search/status filters (unpaginated — "the filtered part", all pages),
// mirroring the query the admin list page itself ran.
export async function GET(request: Request): Promise<Response> {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return Response.json({ error: "Nedostatečná oprávnění." }, { status: 403 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() || undefined;
  const rawStatus = url.searchParams.get("status");
  const status = isParticipationStatus(rawStatus) ? rawStatus : undefined;

  const result = await listPerformersForAdminExport(
    container.performerRepository,
    { query, status },
  );
  if (!result.ok) {
    return Response.json({ error: result.error.message }, { status: 500 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Účinkující");
  sheet.columns = [
    { header: "Jméno", key: "username", width: 28 },
    { header: "E-mail", key: "email", width: 28 },
    { header: "Telefon", key: "phoneNumber", width: 16 },
    { header: "Účast", key: "status", width: 14 },
    { header: "Popis", key: "description", width: 50 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const performer of result.value) {
    sheet.addRow({
      username: performer.username,
      email: performer.email,
      phoneNumber: performer.phoneNumber,
      status: PARTICIPATION_STATUS_LABEL[performer.request],
      description: performer.description,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `ucinkujici-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
