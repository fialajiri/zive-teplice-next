import type { GalleryDto, GalleryRepository } from "@/server/domain/gallery";
import {
  err,
  notFound,
  ok,
  unexpected,
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
