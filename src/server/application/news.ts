import { z } from "zod";
import type { EventRepository } from "@/server/domain/event";
import type {
  CreateNewsInput,
  ImageDto,
  NewsDto,
  NewsRepository,
  UpdateNewsInput,
} from "@/server/domain/news";
import type { StoragePort } from "@/server/domain/storage";
import { yearDateRange } from "@/lib/dates";
import {
  err,
  notFound,
  ok,
  unexpected,
  validation,
  type FieldErrors,
  type Result,
} from "@/server/domain/result";

export async function listNews(
  repo: NewsRepository,
): Promise<Result<NewsDto[]>> {
  try {
    return ok(await repo.list());
  } catch {
    return err(unexpected("Nepodařilo se načíst aktuality."));
  }
}

// "Current ročník" news = createdAt falling within the calendar year of the
// current Event. Falls back to the real calendar year when no Event is marked
// current, so the page still shows something sensible.
export async function listCurrentYearNews(
  newsRepo: NewsRepository,
  eventRepo: EventRepository,
): Promise<Result<NewsDto[]>> {
  try {
    const currentEvent = await eventRepo.getCurrent();
    const year = currentEvent?.year ?? new Date().getFullYear();
    const [start, end] = yearDateRange(year);
    return ok(await newsRepo.listByDateRange(start, end));
  } catch {
    return err(unexpected("Nepodařilo se načíst aktuality."));
  }
}

// Years with archived news, excluding the current ročník's year.
export async function listArchiveYears(
  newsRepo: NewsRepository,
  eventRepo: EventRepository,
): Promise<Result<number[]>> {
  try {
    const [years, currentEvent] = await Promise.all([
      newsRepo.listDistinctYears(),
      eventRepo.getCurrent(),
    ]);
    const currentYear = currentEvent?.year ?? new Date().getFullYear();
    return ok(years.filter((year) => year !== currentYear));
  } catch {
    return err(unexpected("Nepodařilo se načíst archiv aktualit."));
  }
}

export async function listNewsForYear(
  repo: NewsRepository,
  year: number,
): Promise<Result<NewsDto[]>> {
  try {
    const [start, end] = yearDateRange(year);
    return ok(await repo.listByDateRange(start, end));
  } catch {
    return err(unexpected("Nepodařilo se načíst aktuality."));
  }
}

export async function getNews(
  repo: NewsRepository,
  id: string,
): Promise<Result<NewsDto>> {
  try {
    const news = await repo.getById(id);
    if (!news) return err(notFound("Aktualita nebyla nalezena."));
    return ok(news);
  } catch {
    return err(unexpected("Nepodařilo se načíst aktualitu."));
  }
}

// ── Write path ───────────────────────────────────────────────────────────────
// Pure and framework-free (no auth, no sanitize, no revalidate — those live in
// the server action). Validates business rules, orchestrates the repository, and
// keeps S3 consistent by deleting replaced/removed image objects.

export type NewsWriteDeps = {
  news: NewsRepository;
  storage: StoragePort;
};

export type CreateNewsCommand = CreateNewsInput;
export type UpdateNewsCommand = UpdateNewsInput;

// Reject rich-text with no visible characters (e.g. the editor's empty "<p></p>").
function hasVisibleText(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").trim().length > 0;
}

const imageInputSchema = z.object({
  imageUrl: z.url(),
  imageKey: z.string().trim().min(1),
});

// The optional second image is never cropped — width/height are required so the
// detail page can size an exact-aspect-ratio container.
const uncroppedImageInputSchema = z.object({
  imageUrl: z.url(),
  imageKey: z.string().trim().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const titleSchema = z
  .string()
  .trim()
  .min(10, { error: "Titulek musí mít alespoň 10 znaků." })
  .max(75, { error: "Titulek může mít nejvýše 75 znaků." });

const messageSchema = z
  .string()
  .refine(hasVisibleText, { error: "Obsah aktuality nesmí být prázdný." });

const createNewsSchema = z.object({
  title: titleSchema,
  message: messageSchema,
  image: imageInputSchema,
  secondaryImage: uncroppedImageInputSchema.optional(),
});

const updateNewsSchema = z.object({
  title: titleSchema,
  message: messageSchema,
  image: imageInputSchema.optional(),
  secondaryImage: uncroppedImageInputSchema.nullable().optional(),
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

export async function createNews(
  deps: NewsWriteDeps,
  input: CreateNewsCommand,
): Promise<Result<{ id: string }>> {
  const parsed = createNewsSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation(INVALID_INPUT, toFieldErrors(parsed.error)));
  }
  try {
    const id = await deps.news.create(parsed.data);
    return ok({ id });
  } catch {
    return err(unexpected("Aktualitu se nepodařilo uložit."));
  }
}

export async function updateNews(
  deps: NewsWriteDeps,
  id: string,
  input: UpdateNewsCommand,
): Promise<Result<{ id: string }>> {
  const parsed = updateNewsSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation(INVALID_INPUT, toFieldErrors(parsed.error)));
  }
  try {
    const existing = await deps.news.getById(id);
    if (!existing) return err(notFound("Aktualita nebyla nalezena."));

    const updated = await deps.news.update(id, parsed.data);
    if (!updated) return err(notFound("Aktualita nebyla nalezena."));

    // Image replaced → remove the previous S3 object so it doesn't orphan.
    const nextImage: ImageDto | undefined = parsed.data.image;
    if (
      nextImage &&
      existing.image &&
      existing.image.imageKey !== nextImage.imageKey
    ) {
      await deps.storage.deleteObject(existing.image.imageKey);
    }

    // secondaryImage is tri-state: undefined = untouched (skip), an object =
    // replaced, null = explicitly removed — either of the latter two orphans the
    // previous S3 object.
    const nextSecondaryImage = parsed.data.secondaryImage;
    if (
      nextSecondaryImage !== undefined &&
      existing.secondaryImage &&
      existing.secondaryImage.imageKey !== nextSecondaryImage?.imageKey
    ) {
      await deps.storage.deleteObject(existing.secondaryImage.imageKey);
    }
    return ok({ id });
  } catch {
    return err(unexpected("Aktualitu se nepodařilo upravit."));
  }
}

export async function deleteNews(
  deps: NewsWriteDeps,
  id: string,
): Promise<Result<{ id: string }>> {
  try {
    const deleted = await deps.news.delete(id);
    if (!deleted) return err(notFound("Aktualita nebyla nalezena."));
    // Remove the document first, then its S3 image(s) (a storage failure here
    // leaves an orphaned object — the documented, acceptable gap for Phase 3).
    if (deleted.image) await deps.storage.deleteObject(deleted.image.imageKey);
    if (deleted.secondaryImage) {
      await deps.storage.deleteObject(deleted.secondaryImage.imageKey);
    }
    return ok({ id });
  } catch {
    return err(unexpected("Aktualitu se nepodařilo smazat."));
  }
}
