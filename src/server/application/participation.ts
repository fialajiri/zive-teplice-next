import type {
  ParticipationStatus,
  PerformerAccountDto,
  PerformerRepository,
} from "@/server/domain/performer";
import type { Mailer } from "@/server/domain/mailer";
import { ADMIN_PAGE_SIZE, clampPage } from "@/server/domain/pagination";
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

export type PerformerAdminPage = {
  items: PerformerAccountDto[];
  total: number;
  page: number;
  pageSize: number;
};

// Admin search — username OR email, paginated. Sorted by username (repo-level).
export async function searchPerformersForAdmin(
  repo: PerformerRepository,
  params: { query?: string; status?: ParticipationStatus; page?: number },
): Promise<Result<PerformerAdminPage>> {
  const page = clampPage(params.page);
  const pageSize = ADMIN_PAGE_SIZE;
  const query = params.query?.trim() || undefined;
  try {
    const { items, total } = await repo.searchForAdmin({
      query,
      status: params.status,
      page,
      pageSize,
    });
    return ok({ items, total, page, pageSize });
  } catch {
    return err(unexpected("Nepodařilo se načíst účinkující."));
  }
}

// Every performer matching the same filters as searchPerformersForAdmin, but
// unpaginated — backs the admin Excel export ("filtered part", all pages).
export async function listPerformersForAdminExport(
  repo: PerformerRepository,
  params: { query?: string; status?: ParticipationStatus },
): Promise<Result<PerformerAccountDto[]>> {
  const query = params.query?.trim() || undefined;
  try {
    const items = await repo.listAllForAdmin({ query, status: params.status });
    return ok(items);
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
