"use server";

import { revalidatePath } from "next/cache";
import { container } from "@/server/container";
import { requireAdmin } from "@/server/actions/guards";
import { isValidUploadedImage } from "@/server/actions/image-ref";
import { setHomepageContent } from "@/server/application/homepage-content";
import {
  DEFAULT_HOMEPAGE_CONTENT,
  type HomepageContentDto,
  type HomepageImageDto,
} from "@/server/domain/homepage-content";
import type { FieldErrors } from "@/server/domain/result";

export type UpdateHomepageContentResult =
  | { ok: true; content: HomepageContentDto }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

// A client only ever supplies an image it just uploaded via the presign route,
// or leaves the built-in default untouched. An empty `imageKey` is only valid
// when the URL is exactly the known default for that slot — this stops a
// tampered `imageUrl` from sneaking past validation by leaving `imageKey` blank.
function isValidHomepageImage(
  image: HomepageImageDto,
  prefix: "homepageHero" | "homepageAbout",
  defaultUrl: string,
): boolean {
  if (image.imageKey === "") return image.imageUrl === defaultUrl;
  return isValidUploadedImage(image.imageUrl, image.imageKey, prefix);
}

export async function updateHomepageContentAction(
  input: unknown,
): Promise<UpdateHomepageContentResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: "Nedostatečná oprávnění." };

  const record = input as Partial<HomepageContentDto> | null;
  if (!record || typeof record !== "object") {
    return { ok: false, error: "Neplatný požadavek." };
  }

  const heroImage = record.heroImage;
  if (
    !heroImage ||
    !isValidHomepageImage(
      heroImage,
      "homepageHero",
      DEFAULT_HOMEPAGE_CONTENT.heroImage.imageUrl,
    )
  ) {
    return { ok: false, error: "Neplatný obrázek úvodní fotky." };
  }

  const aboutImage = record.aboutImage;
  if (
    !aboutImage ||
    !isValidHomepageImage(
      aboutImage,
      "homepageAbout",
      DEFAULT_HOMEPAGE_CONTENT.aboutImage.imageUrl,
    )
  ) {
    return { ok: false, error: "Neplatný obrázek k textu o festivalu." };
  }

  const result = await setHomepageContent(
    {
      homepageContent: container.homepageContentRepository,
      storage: container.storage,
    },
    record as HomepageContentDto,
  );
  if (!result.ok) {
    return {
      ok: false,
      error: result.error.message,
      fieldErrors:
        result.error.kind === "validation"
          ? result.error.fieldErrors
          : undefined,
    };
  }

  // The public homepage and the admin form both read the current content.
  revalidatePath("/");
  revalidatePath("/admin/uvod");
  return { ok: true, content: result.value };
}
