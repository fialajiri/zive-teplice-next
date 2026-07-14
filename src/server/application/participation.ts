import type {
  ParticipationStatus,
  PerformerRepository,
} from "@/server/domain/performer";
import {
  err,
  notFound,
  ok,
  unexpected,
  validation,
  type Result,
} from "@/server/domain/result";

// Statuses a performer may request participation FROM. Already-`pending` or
// `approved` users can't re-request (prevents spam / status churn).
const REQUESTABLE_FROM: readonly ParticipationStatus[] = [
  "notsend",
  "rejected",
];

export async function requestParticipation(
  repo: PerformerRepository,
  id: string,
): Promise<Result<{ status: ParticipationStatus }>> {
  try {
    const account = await repo.getAccountById(id);
    if (!account) return err(notFound("Účet nebyl nalezen."));

    if (!REQUESTABLE_FROM.includes(account.request)) {
      return err(validation("Žádost o účast už byla odeslána nebo schválena."));
    }

    const updated = await repo.setRequest(id, "pending");
    if (!updated) return err(notFound("Účet nebyl nalezen."));

    return ok({ status: "pending" });
  } catch {
    return err(unexpected("Žádost o účast se nepodařilo odeslat."));
  }
}
