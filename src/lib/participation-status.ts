import type { ParticipationStatus } from "@/server/domain/performer";

// Framework-free — importable from both server code (page.tsx, the export
// route handler) and client components ("use client" modules can't export
// plain values that server code can consume; see AdminStatusFilter/badge).
export const PARTICIPATION_STATUSES: readonly ParticipationStatus[] = [
  "notsend",
  "pending",
  "approved",
  "rejected",
];

export const PARTICIPATION_STATUS_LABEL: Record<ParticipationStatus, string> = {
  notsend: "Nepodáno",
  pending: "Čeká",
  approved: "Schváleno",
  rejected: "Zamítnuto",
};

export function isParticipationStatus(
  value: string | undefined | null,
): value is ParticipationStatus {
  return PARTICIPATION_STATUSES.includes(value as ParticipationStatus);
}
