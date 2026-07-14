"use server";

import { revalidatePath } from "next/cache";
import { container } from "@/server/container";
import { requireSelfOrAdmin } from "@/server/actions/guards";
import { requestParticipation } from "@/server/application/participation";
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
