import type { ParticipationStatus } from "@/server/domain/performer";
import { PARTICIPATION_STATUS_LABEL } from "@/lib/participation-status";

const STATUS_CLASS: Record<ParticipationStatus, string> = {
  notsend: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  approved:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

export function ParticipationStatusBadge({
  status,
}: {
  status: ParticipationStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}
    >
      {PARTICIPATION_STATUS_LABEL[status]}
    </span>
  );
}
