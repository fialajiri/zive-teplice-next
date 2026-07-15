import { z } from "zod";
import type {
  CreateEventInput,
  EventDto,
  EventRepository,
  ProgramInput,
  UpdateEventInput,
} from "@/server/domain/event";
import type { StoragePort } from "@/server/domain/storage";
import { ADMIN_PAGE_SIZE, clampPage } from "@/server/domain/pagination";
import {
  err,
  notFound,
  ok,
  unexpected,
  validation,
  type FieldErrors,
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

export type EventPage = {
  items: EventDto[];
  total: number;
  page: number;
  pageSize: number;
};

// Admin listing, paginated (year desc — same sort as list()).
export async function listEventsPage(
  repo: EventRepository,
  params: { page?: number },
): Promise<Result<EventPage>> {
  const page = clampPage(params.page);
  const pageSize = ADMIN_PAGE_SIZE;
  try {
    const { items, total } = await repo.listPage({ page, pageSize });
    return ok({ items, total, page, pageSize });
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

export async function getEvent(
  repo: EventRepository,
  id: string,
): Promise<Result<EventDto>> {
  try {
    const event = await repo.getById(id);
    if (!event) return err(notFound("Ročník nebyl nalezen."));
    return ok(event);
  } catch {
    return err(unexpected("Nepodařilo se načíst ročník."));
  }
}

// ── Write path ───────────────────────────────────────────────────────────────
// Pure and framework-free (no auth, no sanitize, no revalidate). The current-flip
// and user-request reset are the repo transaction's job; the use case only
// validates and orchestrates.

export type EventWriteDeps = {
  events: EventRepository;
  storage: StoragePort;
};

// Program's image is never cropped — width/height are required so the public
// page can size an exact-aspect-ratio container.
const uncroppedImageInputSchema = z.object({
  imageUrl: z.url(),
  imageKey: z.string().trim().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

// Legacy `routes/event.js`: title 10–100, year a 4-digit number.
const titleSchema = z
  .string()
  .trim()
  .min(10, { error: "Název ročníku musí mít alespoň 10 znaků." })
  .max(100, { error: "Název ročníku může mít nejvýše 100 znaků." });

const yearSchema = z
  .number({ error: "Zadejte prosím rok." })
  .int({ error: "Rok musí být celé číslo." })
  .min(1000, { error: "Rok musí být čtyřmístné číslo." })
  .max(9999, { error: "Rok musí být čtyřmístné číslo." });

const eventSchema = z.object({ title: titleSchema, year: yearSchema });

// Reject rich-text with no visible characters (e.g. the editor's empty "<p></p>").
function hasVisibleText(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").trim().length > 0;
}

const programTitleSchema = z
  .string()
  .trim()
  .min(10, { error: "Název programu musí mít alespoň 10 znaků." })
  .max(100, { error: "Název programu může mít nejvýše 100 znaků." });

const messageSchema = z
  .string()
  .refine(hasVisibleText, { error: "Obsah programu nesmí být prázdný." });

const addProgramSchema = z.object({
  title: programTitleSchema,
  message: messageSchema,
  image: uncroppedImageInputSchema,
});

const updateProgramSchema = z.object({
  title: programTitleSchema,
  message: messageSchema,
  image: uncroppedImageInputSchema.optional(),
});

function toFieldErrors(error: z.ZodError): FieldErrors {
  const flat = z.flattenError(error);
  const out: FieldErrors = {};
  for (const [field, messages] of Object.entries(flat.fieldErrors)) {
    if (Array.isArray(messages) && messages.length > 0) {
      out[field] = messages as string[];
    }
  }
  return out;
}

const INVALID_INPUT = "Zkontrolujte prosím zadané údaje.";

export async function createEvent(
  deps: EventWriteDeps,
  input: CreateEventInput,
): Promise<Result<{ id: string }>> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation(INVALID_INPUT, toFieldErrors(parsed.error)));
  }
  try {
    const id = await deps.events.createCurrent(parsed.data);
    return ok({ id });
  } catch {
    return err(unexpected("Ročník se nepodařilo vytvořit."));
  }
}

export async function updateEvent(
  deps: EventWriteDeps,
  id: string,
  input: UpdateEventInput,
): Promise<Result<{ id: string }>> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation(INVALID_INPUT, toFieldErrors(parsed.error)));
  }
  try {
    const updated = await deps.events.update(id, parsed.data);
    if (!updated) return err(notFound("Ročník nebyl nalezen."));
    return ok({ id });
  } catch {
    return err(unexpected("Ročník se nepodařilo upravit."));
  }
}

export async function deleteEvent(
  deps: EventWriteDeps,
  id: string,
): Promise<Result<{ id: string }>> {
  try {
    const deleted = await deps.events.delete(id);
    if (!deleted) return err(notFound("Ročník nebyl nalezen."));
    // Remove the associated program image (the Program document itself is removed
    // by the repo). An orphaned S3 object here is the documented, acceptable gap.
    if (deleted.program?.image) {
      await deps.storage
        .deleteObject(deleted.program.image.imageKey)
        .catch(() => undefined);
    }
    return ok({ id });
  } catch {
    return err(unexpected("Ročník se nepodařilo smazat."));
  }
}

export async function addProgram(
  deps: EventWriteDeps,
  eventId: string,
  input: ProgramInput,
): Promise<Result<{ id: string }>> {
  const parsed = addProgramSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation(INVALID_INPUT, toFieldErrors(parsed.error)));
  }
  try {
    const event = await deps.events.getById(eventId);
    if (!event) return err(notFound("Ročník nebyl nalezen."));
    if (event.program) {
      return err(
        validation("Ročník už program má — použijte úpravu programu."),
      );
    }
    const updated = await deps.events.addProgram(eventId, parsed.data);
    if (!updated) return err(notFound("Ročník nebyl nalezen."));
    return ok({ id: eventId });
  } catch {
    return err(unexpected("Program se nepodařilo přidat."));
  }
}

export async function updateProgram(
  deps: EventWriteDeps,
  eventId: string,
  input: ProgramInput,
): Promise<Result<{ id: string }>> {
  const parsed = updateProgramSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation(INVALID_INPUT, toFieldErrors(parsed.error)));
  }
  try {
    const result = await deps.events.updateProgram(eventId, parsed.data);
    if (!result) return err(notFound("Program nebyl nalezen."));
    // Replaced the image → drop the previous S3 object (guard against deleting the
    // freshly-set key if it somehow matched).
    const { replacedImageKey } = result;
    if (replacedImageKey && replacedImageKey !== parsed.data.image?.imageKey) {
      await deps.storage.deleteObject(replacedImageKey).catch(() => undefined);
    }
    return ok({ id: eventId });
  } catch {
    return err(unexpected("Program se nepodařilo upravit."));
  }
}
