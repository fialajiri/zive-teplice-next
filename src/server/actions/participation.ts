"use server";

import { revalidatePath } from "next/cache";
import { container } from "@/server/container";
import { requireAdmin, requireSelfOrAdmin } from "@/server/actions/guards";
import {
  requestParticipation,
  decideParticipation,
  type ParticipationDecision,
} from "@/server/application/participation";
import type { DomainError } from "@/server/domain/result";

export type ParticipationActionResult =
  { ok: true } | { ok: false; error: string };

function mapError(error: DomainError): ParticipationActionResult {
  return { ok: false, error: error.message };
}

export async function requestParticipationAction(
  id: string,
): Promise<ParticipationActionResult> {
  // Self (or admin) requests — never derive identity from a client field.
  const auth = await requireSelfOrAdmin(id);
  if (!auth.ok) return { ok: false, error: "Nedostatečná oprávnění." };

  const result = await requestParticipation(container.performerRepository, id);
  if (!result.ok) return mapError(result.error);

  revalidatePath("/ucet");
  return { ok: true };
}

const DECISIONS: readonly ParticipationDecision[] = ["approved", "rejected"];

function isDecision(value: unknown): value is ParticipationDecision {
  return (
    typeof value === "string" &&
    DECISIONS.includes(value as ParticipationDecision)
  );
}

export async function decideParticipationAction(
  id: string,
  decision: ParticipationDecision,
): Promise<ParticipationActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: "Nedostatečná oprávnění." };

  // Never trust the client value — only the two known decisions are accepted.
  if (!isDecision(decision)) {
    return { ok: false, error: "Neplatný požadavek." };
  }

  const result = await decideParticipation(
    { performers: container.performerRepository, mailer: container.mailer },
    id,
    decision,
  );
  if (!result.ok) return mapError(result.error);

  revalidatePath("/admin/ucinkujici");
  revalidatePath("/ucinkujici");
  return { ok: true };
}
