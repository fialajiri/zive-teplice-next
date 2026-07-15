"use server";

import { revalidatePath } from "next/cache";
import { container } from "@/server/container";
import { requireAdmin } from "@/server/actions/guards";
import {
  createNews,
  updateNews,
  deleteNews,
  type NewsWriteDeps,
} from "@/server/application/news";
import type { ImageDto, UncroppedImageDto } from "@/server/domain/news";
import type { DomainError, FieldErrors } from "@/server/domain/result";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { isValidUploadedImage } from "@/server/actions/image-ref";

export type NewsActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export type CreateNewsFormInput = {
  title: string;
  message: string;
  imageUrl: string;
  imageKey: string;
  // Optional, uncropped second image (e.g. a flyer or site map).
  secondaryImageUrl?: string;
  secondaryImageKey?: string;
  secondaryImageWidth?: number;
  secondaryImageHeight?: number;
};

export type UpdateNewsFormInput = {
  title: string;
  message: string;
  // Present only when the admin is replacing the existing image.
  imageUrl?: string;
  imageKey?: string;
  // Present only when the admin uploaded a new second image.
  secondaryImageUrl?: string;
  secondaryImageKey?: string;
  secondaryImageWidth?: number;
  secondaryImageHeight?: number;
  // Present when the admin explicitly removed the second image.
  removeSecondaryImage?: boolean;
};

const FORBIDDEN: NewsActionResult = {
  ok: false,
  error: "Nedostatečná oprávnění.",
};

const INVALID_IMAGE: NewsActionResult = {
  ok: false,
  error: "Neplatný obrázek.",
  fieldErrors: { image: ["Nahrajte prosím platný obrázek (PNG nebo JPG)."] },
};

const INVALID_SECONDARY_IMAGE: NewsActionResult = {
  ok: false,
  error: "Neplatný druhý obrázek.",
  fieldErrors: {
    secondaryImage: ["Nahrajte prosím platný obrázek (PNG nebo JPG)."],
  },
};

function writeDeps(): NewsWriteDeps {
  return { news: container.newsRepository, storage: container.storage };
}

type SecondaryImageInput = {
  secondaryImageUrl?: string;
  secondaryImageKey?: string;
  secondaryImageWidth?: number;
  secondaryImageHeight?: number;
};

type SecondaryImageParseResult =
  | { ok: true; value: UncroppedImageDto | undefined }
  | { ok: false; result: NewsActionResult };

// secondaryImage is fully optional — absent url/key means "not supplied". When
// present, it must carry valid width/height (it's never cropped, so the display
// side relies on them for the exact aspect ratio).
function parseSecondaryImage(
  input: SecondaryImageInput,
): SecondaryImageParseResult {
  if (!input.secondaryImageUrl && !input.secondaryImageKey) {
    return { ok: true, value: undefined };
  }
  const imageUrl = String(input.secondaryImageUrl ?? "");
  const imageKey = String(input.secondaryImageKey ?? "");
  const width = Number(input.secondaryImageWidth);
  const height = Number(input.secondaryImageHeight);
  if (
    !isValidUploadedImage(imageUrl, imageKey, "news") ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return { ok: false, result: INVALID_SECONDARY_IMAGE };
  }
  return { ok: true, value: { imageUrl, imageKey, width, height } };
}

function mapError(error: DomainError): NewsActionResult {
  if (error.kind === "validation") {
    return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
  }
  return { ok: false, error: error.message };
}

// One item mutated → refresh its detail page, the list, and the home page (which
// shows the latest three). Order doesn't matter; none of these throw.
function revalidateNews(id: string): void {
  revalidatePath("/aktuality");
  revalidatePath(`/aktuality/${id}`);
  revalidatePath("/");
}

export async function createNewsAction(
  input: CreateNewsFormInput,
): Promise<NewsActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return FORBIDDEN;

  const title = String(input?.title ?? "");
  const message = sanitizeRichText(String(input?.message ?? ""));
  const imageUrl = String(input?.imageUrl ?? "");
  const imageKey = String(input?.imageKey ?? "");

  if (!isValidUploadedImage(imageUrl, imageKey, "news")) return INVALID_IMAGE;

  const secondaryImage = parseSecondaryImage(input);
  if (!secondaryImage.ok) return secondaryImage.result;

  const result = await createNews(writeDeps(), {
    title,
    message,
    image: { imageUrl, imageKey },
    secondaryImage: secondaryImage.value,
  });
  if (!result.ok) return mapError(result.error);

  revalidateNews(result.value.id);
  return { ok: true, id: result.value.id };
}

export async function updateNewsAction(
  id: string,
  input: UpdateNewsFormInput,
): Promise<NewsActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return FORBIDDEN;

  const title = String(input?.title ?? "");
  const message = sanitizeRichText(String(input?.message ?? ""));

  // Image is optional on edit: only validate + replace when a new one was uploaded.
  let image: ImageDto | undefined;
  if (input?.imageUrl || input?.imageKey) {
    const imageUrl = String(input.imageUrl ?? "");
    const imageKey = String(input.imageKey ?? "");
    if (!isValidUploadedImage(imageUrl, imageKey, "news")) return INVALID_IMAGE;
    image = { imageUrl, imageKey };
  }

  // secondaryImage is tri-state: explicit removal, a fresh replacement, or
  // untouched (omit entirely so the repo leaves the existing one alone).
  let secondaryImage: UncroppedImageDto | null | undefined;
  if (input?.removeSecondaryImage) {
    secondaryImage = null;
  } else {
    const parsed = parseSecondaryImage(input ?? {});
    if (!parsed.ok) return parsed.result;
    secondaryImage = parsed.value;
  }

  const result = await updateNews(writeDeps(), id, {
    title,
    message,
    image,
    secondaryImage,
  });
  if (!result.ok) return mapError(result.error);

  revalidateNews(id);
  return { ok: true, id };
}

export async function deleteNewsAction(id: string): Promise<NewsActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return FORBIDDEN;
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, error: "Neplatný požadavek." };
  }

  const result = await deleteNews(writeDeps(), id);
  if (!result.ok) return mapError(result.error);

  revalidateNews(id);
  return { ok: true, id };
}
