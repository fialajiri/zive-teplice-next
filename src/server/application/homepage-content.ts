import { z } from "zod";
import {
  DEFAULT_HOMEPAGE_CONTENT,
  type HomepageContentDto,
  type HomepageContentRepository,
} from "@/server/domain/homepage-content";
import type { StoragePort } from "@/server/domain/storage";
import {
  err,
  ok,
  unexpected,
  validation,
  type FieldErrors,
  type Result,
} from "@/server/domain/result";

// Read. Fails safe: a database hiccup must never take the homepage down, so a
// repository error falls back to the same static copy the site shipped with.
export async function getHomepageContent(
  repo: HomepageContentRepository,
): Promise<HomepageContentDto> {
  try {
    return await repo.get();
  } catch {
    return DEFAULT_HOMEPAGE_CONTENT;
  }
}

// Bounds sized to comfortably exceed the current copy while keeping the fixed
// 2x2 highlight grid and the `max-w-3xl` about paragraph from growing
// unpredictably tall. Image URL/key shape is checked here; whether an image is
// actually a legitimate upload (vs. a tampered reference) is re-checked in the
// action layer, which knows the per-slot default path and upload prefix.
const homepageImageSchema = z.object({
  imageUrl: z.string().trim().min(1),
  imageKey: z.string().trim(),
  alt: z
    .string()
    .trim()
    .min(1, { error: "Popisek obrázku je povinný." })
    .max(200, { error: "Popisek může mít nejvýše 200 znaků." }),
});

const highlightSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { error: "Nadpis musí mít alespoň 3 znaky." })
    .max(32, { error: "Nadpis může mít nejvýše 32 znaků." }),
  description: z
    .string()
    .trim()
    .min(10, { error: "Popis musí mít alespoň 10 znaků." })
    .max(100, { error: "Popis může mít nejvýše 100 znaků." }),
});

const homepageContentSchema = z.object({
  heroImage: homepageImageSchema,
  aboutText: z
    .string()
    .trim()
    .min(50, { error: "Text musí mít alespoň 50 znaků." })
    .max(600, { error: "Text může mít nejvýše 600 znaků." }),
  aboutImage: homepageImageSchema,
  // Exactly 4, fixed order — matches the `HomepageHighlightsDto` 4-tuple type.
  highlights: z.tuple([
    highlightSchema,
    highlightSchema,
    highlightSchema,
    highlightSchema,
  ]),
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

export type HomepageContentWriteDeps = {
  homepageContent: HomepageContentRepository;
  storage: StoragePort;
};

// Admin write. The whole content is edited and saved as one unit (a single
// live-preview form, not independently-toggled fields), so the input has the
// same shape as the read DTO.
export async function setHomepageContent(
  deps: HomepageContentWriteDeps,
  input: HomepageContentDto,
): Promise<Result<HomepageContentDto>> {
  const parsed = homepageContentSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      validation(
        "Zkontrolujte prosím zadaný obsah.",
        toFieldErrors(parsed.error),
      ),
    );
  }
  try {
    const existing = await deps.homepageContent.get();
    const updated = await deps.homepageContent.set(parsed.data);

    // Image replaced → remove the previous S3 object so it doesn't orphan.
    // An empty `imageKey` means the built-in default (a static file, not S3) —
    // nothing to delete.
    if (
      existing.heroImage.imageKey &&
      existing.heroImage.imageKey !== updated.heroImage.imageKey
    ) {
      await deps.storage.deleteObject(existing.heroImage.imageKey);
    }
    if (
      existing.aboutImage.imageKey &&
      existing.aboutImage.imageKey !== updated.aboutImage.imageKey
    ) {
      await deps.storage.deleteObject(existing.aboutImage.imageKey);
    }

    return ok(updated);
  } catch {
    return err(unexpected("Nepodařilo se uložit obsah úvodní stránky."));
  }
}
