import { z } from "zod";
import type {
  PerformerAccountDto,
  PerformerDto,
  PerformerRepository,
  UpdatePerformerInput,
} from "@/server/domain/performer";
import type { ImageDto } from "@/server/domain/news";
import type { StoragePort } from "@/server/domain/storage";
import {
  err,
  notFound,
  ok,
  unexpected,
  validation,
  type FieldErrors,
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

export async function getPerformerAccount(
  repo: PerformerRepository,
  id: string,
): Promise<Result<PerformerAccountDto>> {
  try {
    const account = await repo.getAccountById(id);
    if (!account) return err(notFound("Účet nebyl nalezen."));
    return ok(account);
  } catch {
    return err(unexpected("Nepodařilo se načíst účet."));
  }
}

// ── Write path ───────────────────────────────────────────────────────────────
// Pure and framework-free (no auth, no revalidate — those live in the action).
// `updatePerformer` never touches role/request and keeps S3 consistent by
// deleting a replaced image; `deletePerformer` removes the S3 object too.

export type PerformerWriteDeps = {
  performers: PerformerRepository;
  storage: StoragePort;
};

const imageInputSchema = z.object({
  imageUrl: z.url(),
  imageKey: z.string().trim().min(1),
});

const updatePerformerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, { error: "Jméno musí mít alespoň 3 znaky." })
    .max(50, { error: "Jméno může mít nejvýše 50 znaků." }),
  phoneNumber: z
    .string()
    .trim()
    .min(9, { error: "Zadejte platné telefonní číslo." }),
  description: z
    .string()
    .trim()
    .max(1000, { error: "Popis může mít nejvýše 1000 znaků." })
    .default(""),
  image: imageInputSchema.optional(),
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

export async function updatePerformer(
  deps: PerformerWriteDeps,
  id: string,
  input: UpdatePerformerInput,
): Promise<Result<{ id: string }>> {
  const parsed = updatePerformerSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation(INVALID_INPUT, toFieldErrors(parsed.error)));
  }
  try {
    const existing = await deps.performers.getAccountById(id);
    if (!existing) return err(notFound("Účet nebyl nalezen."));

    // Username uniqueness — only when actually changing it (else the user's own
    // current name would collide with itself).
    if (
      parsed.data.username !== existing.username &&
      (await deps.performers.existsByUsername(parsed.data.username))
    ) {
      return err(
        validation(INVALID_INPUT, {
          username: ["Toto jméno je již obsazené."],
        }),
      );
    }

    const updated = await deps.performers.update(id, parsed.data);
    if (!updated) return err(notFound("Účet nebyl nalezen."));

    // Image replaced → remove the previous S3 object so it doesn't orphan.
    const nextImage: ImageDto | undefined = parsed.data.image;
    if (
      nextImage &&
      existing.image &&
      existing.image.imageKey !== nextImage.imageKey
    ) {
      await deps.storage.deleteObject(existing.image.imageKey);
    }
    return ok({ id });
  } catch {
    return err(unexpected("Profil se nepodařilo upravit."));
  }
}

export async function deletePerformer(
  deps: PerformerWriteDeps,
  id: string,
): Promise<Result<{ id: string }>> {
  try {
    const deleted = await deps.performers.delete(id);
    if (!deleted) return err(notFound("Účet nebyl nalezen."));
    // Remove the document first, then its S3 image (a storage failure here
    // leaves an orphaned object — the documented, acceptable gap, as with news).
    if (deleted.image) await deps.storage.deleteObject(deleted.image.imageKey);
    return ok({ id });
  } catch {
    return err(unexpected("Účet se nepodařilo smazat."));
  }
}
