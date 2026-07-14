"use server";

import { revalidatePath } from "next/cache";
import { container } from "@/server/container";
import { requireAdmin } from "@/server/actions/guards";
import { isValidUploadedImage } from "@/server/actions/image-ref";
import {
  createGallery,
  appendGalleryImages,
  removeGalleryImage,
  deleteGallery,
  type GalleryWriteDeps,
} from "@/server/application/gallery";
import type { GalleryImageInput } from "@/server/domain/gallery";
import type { DomainError, FieldErrors } from "@/server/domain/result";

export type GalleryActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export type CreateGalleryFormInput = {
  name: string;
  imageUrl: string;
  imageKey: string;
};

const FORBIDDEN: GalleryActionResult = {
  ok: false,
  error: "Nedostatečná oprávnění.",
};

const INVALID_IMAGE: GalleryActionResult = {
  ok: false,
  error: "Neplatný obrázek.",
  fieldErrors: { image: ["Nahrajte prosím platný obrázek (PNG nebo JPG)."] },
};

function writeDeps(): GalleryWriteDeps {
  return { gallery: container.galleryRepository, storage: container.storage };
}

function mapError(error: DomainError): GalleryActionResult {
  if (error.kind === "validation") {
    return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
  }
  return { ok: false, error: error.message };
}

// A create/append/remove touches the list, the gallery detail page, and its admin
// manage page. Order doesn't matter; none of these throw.
function revalidateGallery(id: string): void {
  revalidatePath("/galerie");
  revalidatePath(`/galerie/${id}`);
  revalidatePath(`/admin/galerie/${id}`);
}

export async function createGalleryAction(
  input: CreateGalleryFormInput,
): Promise<GalleryActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return FORBIDDEN;

  const name = String(input?.name ?? "");
  const imageUrl = String(input?.imageUrl ?? "");
  const imageKey = String(input?.imageKey ?? "");

  if (!isValidUploadedImage(imageUrl, imageKey, "gallery")) {
    return INVALID_IMAGE;
  }

  const result = await createGallery(writeDeps(), {
    name,
    featuredImage: { imageUrl, imageKey },
  });
  if (!result.ok) return mapError(result.error);

  revalidatePath("/galerie");
  return { ok: true, id: result.value.id };
}

export async function appendGalleryImagesAction(
  id: string,
  images: GalleryImageInput[],
): Promise<GalleryActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return FORBIDDEN;
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, error: "Neplatný požadavek." };
  }

  const list = Array.isArray(images) ? images : [];
  // Re-validate every ref server-side; reject the batch if any is not ours.
  for (const img of list) {
    const imageUrl = String(img?.imageUrl ?? "");
    const imageKey = String(img?.imageKey ?? "");
    if (!isValidUploadedImage(imageUrl, imageKey, "gallery")) {
      return INVALID_IMAGE;
    }
  }

  const result = await appendGalleryImages(writeDeps(), id, list);
  if (!result.ok) return mapError(result.error);

  revalidateGallery(id);
  return { ok: true, id };
}

export async function removeGalleryImageAction(
  id: string,
  imageId: string,
): Promise<GalleryActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return FORBIDDEN;
  if (
    typeof id !== "string" ||
    id.length === 0 ||
    typeof imageId !== "string" ||
    imageId.length === 0
  ) {
    return { ok: false, error: "Neplatný požadavek." };
  }

  const result = await removeGalleryImage(writeDeps(), id, imageId);
  if (!result.ok) return mapError(result.error);

  revalidateGallery(id);
  return { ok: true, id };
}

export async function deleteGalleryAction(
  id: string,
): Promise<GalleryActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return FORBIDDEN;
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, error: "Neplatný požadavek." };
  }

  const result = await deleteGallery(writeDeps(), id);
  if (!result.ok) return mapError(result.error);

  revalidatePath("/galerie");
  revalidatePath(`/galerie/${id}`);
  return { ok: true, id };
}
