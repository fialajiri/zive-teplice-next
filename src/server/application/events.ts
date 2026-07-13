import type { EventDto, EventRepository } from "@/server/domain/event";
import {
  err,
  notFound,
  ok,
  unexpected,
  type Result,
} from "@/server/domain/result";

export async function listEvents(
  repo: EventRepository,
): Promise<Result<EventDto[]>> {
  try {
    return ok(await repo.list());
  } catch {
    return err(unexpected("Nepodařilo se načíst ročníky."));
  }
}

export async function getCurrentEvent(
  repo: EventRepository,
): Promise<Result<EventDto>> {
  try {
    const event = await repo.getCurrent();
    if (!event) return err(notFound("Aktuální ročník nebyl nalezen."));
    return ok(event);
  } catch {
    return err(unexpected("Nepodařilo se načíst program."));
  }
}
