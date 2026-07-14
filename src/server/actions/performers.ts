"use server";

import { revalidatePath } from "next/cache";
import { container } from "@/server/container";
import { requireSelfOrAdmin } from "@/server/actions/guards";
import {
  updatePerformer,
  deletePerformer,
  type PerformerWriteDeps,
} from "@/server/application/performers";
import type { ImageDto } from "@/server/domain/news";
import type { DomainError, FieldErrors } from "@/server/domain/result";
import { isValidUploadedImage } from "@/server/actions/image-ref";

export type PerformerActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export type UpdatePerformerFormInput = {
  username: string;
  phoneNumber: string;
  description: string;
  // Present only when the performer is replacing the existing image.
  imageUrl?: string;
  imageKey?: string;
};

const FORBIDDEN: PerformerActionResult = {
  ok: false,
  error: "Nedostatečná oprávnění.",
};

const INVALID_IMAGE: PerformerActionResult = {
  ok: false,
  error: "Neplatný obrázek.",
  fieldErrors: { image: ["Nahrajte prosím platný obrázek (PNG nebo JPG)."] },
};

function writeDeps(): PerformerWriteDeps {
  return {
    performers: container.performerRepository,
    storage: container.storage,
  };
}

function mapError(error: DomainError): PerformerActionResult {
  if (error.kind === "validation") {
    return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
  }
  return { ok: false, error: error.message };
}

// One performer mutated → their public profile + the list + their account area.
function revalidatePerformer(id: string): void {
  revalidatePath("/ucinkujici");
  revalidatePath(`/ucinkujici/${id}`);
  revalidatePath("/ucet");
}

export async function updatePerformerAction(
  id: string,
  input: UpdatePerformerFormInput,
): Promise<PerformerActionResult> {
  const auth = await requireSelfOrAdmin(id);
  if (!auth.ok) return FORBIDDEN;

  // Image optional on edit: only validate + replace when a new one was uploaded.
  let image: ImageDto | undefined;
  if (input?.imageUrl || input?.imageKey) {
    const imageUrl = String(input.imageUrl ?? "");
    const imageKey = String(input.imageKey ?? "");
    if (!isValidUploadedImage(imageUrl, imageKey, "performer")) {
      return INVALID_IMAGE;
    }
    image = { imageUrl, imageKey };
  }

  const result = await updatePerformer(writeDeps(), id, {
    username: String(input?.username ?? ""),
    phoneNumber: String(input?.phoneNumber ?? ""),
    description: String(input?.description ?? ""),
    image,
  });
  if (!result.ok) return mapError(result.error);

  revalidatePerformer(id);
  return { ok: true, id };
}

export async function deletePerformerAction(
  id: string,
): Promise<PerformerActionResult> {
  const auth = await requireSelfOrAdmin(id);
  if (!auth.ok) return FORBIDDEN;
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, error: "Neplatný požadavek." };
  }

  const result = await deletePerformer(writeDeps(), id);
  if (!result.ok) return mapError(result.error);

  revalidatePerformer(id);
  return { ok: true, id };
}
