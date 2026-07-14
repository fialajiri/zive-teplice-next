import type {
  ParticipationStatus,
  PerformerAccountDto,
  PerformerRepository,
} from "@/server/domain/performer";
import type { Mailer } from "@/server/domain/mailer";
import { participationDecisionEmail } from "@/server/infrastructure/email/templates";
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

// ── Admin side ───────────────────────────────────────────────────────────────

export async function listPerformersForAdmin(
  repo: PerformerRepository,
): Promise<Result<PerformerAccountDto[]>> {
  try {
    return ok(await repo.listForAdmin());
  } catch {
    return err(unexpected("Nepodařilo se načíst účinkující."));
  }
}

export type ParticipationDecisionDeps = {
  performers: PerformerRepository;
  mailer: Mailer;
};

export type ParticipationDecision = "approved" | "rejected";

export async function decideParticipation(
  deps: ParticipationDecisionDeps,
  id: string,
  decision: ParticipationDecision,
): Promise<Result<{ status: ParticipationStatus }>> {
  try {
    const account = await deps.performers.getAccountById(id);
    if (!account) return err(notFound("Účinkující nebyl nalezen."));

    const updated = await deps.performers.setRequest(id, decision);
    if (!updated) return err(notFound("Účinkující nebyl nalezen."));

    // Best-effort notification (gotcha #6): the decision is already persisted, so
    // an email failure must NOT roll it back. We ignore the send Result on purpose.
    const content = participationDecisionEmail(decision);
    await deps.mailer.send({ to: account.email, ...content });

    return ok({ status: decision });
  } catch {
    return err(unexpected("Rozhodnutí se nepodařilo uložit."));
  }
}
