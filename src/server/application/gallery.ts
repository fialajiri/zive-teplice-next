import { z } from "zod";
import type {
  CreateGalleryInput,
  GalleryDto,
  GalleryImageInput,
  GalleryRepository,
} from "@/server/domain/gallery";
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

export async function listGalleries(
  repo: GalleryRepository,
): Promise<Result<GalleryDto[]>> {
  try {
    return ok(await repo.list());
  } catch {
    return err(unexpected("Nepodařilo se načíst galerie."));
  }
}

export async function getGallery(
  repo: GalleryRepository,
  id: string,
): Promise<Result<GalleryDto>> {
  try {
    const gallery = await repo.getById(id);
    if (!gallery) return err(notFound("Galerie nebyla nalezena."));
    return ok(gallery);
  } catch {
    return err(unexpected("Nepodařilo se načíst galerii."));
  }
}

// ── Write path ───────────────────────────────────────────────────────────────
// Pure and framework-free (no auth, no revalidate — those live in the server
// action). Validates business rules, orchestrates the repository, and keeps S3
// consistent by deleting removed/orphaned image objects.

export type GalleryWriteDeps = {
  gallery: GalleryRepository;
  storage: StoragePort;
};

const imageInputSchema = z.object({
  imageUrl: z.url(),
  imageKey: z.string().trim().min(1),
});

// Legacy `routes/gallery.js`: name length 4–15.
const nameSchema = z
  .string()
  .trim()
  .min(4, { error: "Název galerie musí mít alespoň 4 znaky." })
  .max(15, { error: "Název galerie může mít nejvýše 15 znaků." });

const createGallerySchema = z.object({
  name: nameSchema,
  featuredImage: imageInputSchema,
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

export async function createGallery(
  deps: GalleryWriteDeps,
  input: CreateGalleryInput,
): Promise<Result<{ id: string }>> {
  const parsed = createGallerySchema.safeParse(input);
  if (!parsed.success) {
    return err(validation(INVALID_INPUT, toFieldErrors(parsed.error)));
  }
  try {
    const id = await deps.gallery.create(parsed.data);
    return ok({ id });
  } catch {
    return err(unexpected("Galerii se nepodařilo vytvořit."));
  }
}

export async function appendGalleryImages(
  deps: GalleryWriteDeps,
  id: string,
  images: GalleryImageInput[],
): Promise<Result<{ id: string; added: number }>> {
  // Ignore any empty/partial pairs; each surviving ref was already host-validated
  // by the action. Nothing to persist → treat as a no-op success.
  const clean = images.filter((img) => img.imageUrl && img.imageKey);
  const parsed = z.array(imageInputSchema).safeParse(clean);
  if (!parsed.success) {
    return err(validation(INVALID_INPUT));
  }
  if (parsed.data.length === 0) return ok({ id, added: 0 });

  try {
    const updated = await deps.gallery.appendImages(id, parsed.data);
    if (!updated) return err(notFound("Galerie nebyla nalezena."));
    return ok({ id, added: parsed.data.length });
  } catch {
    return err(unexpected("Fotky se nepodařilo uložit."));
  }
}

export async function removeGalleryImage(
  deps: GalleryWriteDeps,
  id: string,
  imageId: string,
): Promise<Result<{ id: string }>> {
  try {
    const gallery = await deps.gallery.getById(id);
    if (!gallery) return err(notFound("Galerie nebyla nalezena."));

    const image = gallery.images.find((img) => img.id === imageId);
    if (!image) return err(notFound("Fotka nebyla nalezena."));

    const updated = await deps.gallery.removeImage(id, imageId);
    if (!updated) return err(notFound("Fotka nebyla nalezena."));

    // Remove the S3 object after the subdoc is gone (an orphan here is the
    // documented, acceptable gap — same as news delete).
    await deps.storage.deleteObject(image.imageKey);
    return ok({ id });
  } catch {
    return err(unexpected("Fotku se nepodařilo odstranit."));
  }
}

export async function deleteGallery(
  deps: GalleryWriteDeps,
  id: string,
): Promise<Result<{ id: string }>> {
  try {
    const deleted = await deps.gallery.delete(id);
    if (!deleted) return err(notFound("Galerie nebyla nalezena."));

    // Remove the document first, then every S3 object it referenced — the
    // featured image plus each photo. Storage failures leave orphaned objects
    // (documented gap); one bad key must not abort the rest.
    const keys = [
      deleted.featuredImage?.imageKey,
      ...deleted.images.map((img) => img.imageKey),
    ].filter((key): key is string => Boolean(key));

    await Promise.all(
      keys.map((key) => deps.storage.deleteObject(key).catch(() => undefined)),
    );
    return ok({ id });
  } catch {
    return err(unexpected("Galerii se nepodařilo smazat."));
  }
}
