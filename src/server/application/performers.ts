import type {
  PerformerDto,
  PerformerRepository,
} from "@/server/domain/performer";
import {
  err,
  notFound,
  ok,
  unexpected,
  type Result,
} from "@/server/domain/result";

export async function listPerformers(
  repo: PerformerRepository,
): Promise<Result<PerformerDto[]>> {
  try {
    return ok(await repo.list());
  } catch {
    return err(unexpected("Nepodařilo se načíst účinkující."));
  }
}

export async function getPerformer(
  repo: PerformerRepository,
  id: string,
): Promise<Result<PerformerDto>> {
  try {
    const performer = await repo.getById(id);
    if (!performer) return err(notFound("Účinkující nebyl nalezen."));
    return ok(performer);
  } catch {
    return err(unexpected("Nepodařilo se načíst profil účinkujícího."));
  }
}
