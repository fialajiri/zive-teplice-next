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
import type { ImageDto } from "@/server/domain/news";
import type { DomainError, FieldErrors } from "@/server/domain/result";
import { sanitizeRichText } from "@/lib/sanitize-html";

export type NewsActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export type CreateNewsFormInput = {
  title: string;
  message: string;
  imageUrl: string;
  imageKey: string;
};

export type UpdateNewsFormInput = {
  title: string;
  message: string;
  // Present only when the admin is replacing the existing image.
  imageUrl?: string;
  imageKey?: string;
};

const FORBIDDEN: NewsActionResult = {
  ok: false,
  error: "Nedostatečná oprávnění.",
};

// Hosts an `imageUrl` may legitimately point at — the configured public host plus
// the known S3/CloudFront origins already allow-listed in next.config.
const ALLOWED_IMAGE_HOSTS = new Set(
  [
    process.env.S3_PUBLIC_HOST,
    "d374dusjcsfayx.cloudfront.net",
    "zive-teplice.s3.eu-central-1.amazonaws.com",
  ].filter((host): host is string => Boolean(host)),
);

// A client only ever supplies a reference to an object it just uploaded via our
// presign route. Re-validate it server-side so it can't be re-pointed at an
// arbitrary key/host: the key must live under `news/`, the URL must be https on
// an allow-listed host, and the URL must resolve to exactly that key.
function isValidNewsImage(imageUrl: string, imageKey: string): boolean {
  if (!imageKey.startsWith("news/") || imageKey.includes("..")) return false;
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (!ALLOWED_IMAGE_HOSTS.has(url.host)) return false;
  return decodeURIComponent(url.pathname) === `/${imageKey}`;
}

const INVALID_IMAGE: NewsActionResult = {
  ok: false,
  error: "Neplatný obrázek.",
  fieldErrors: { image: ["Nahrajte prosím platný obrázek (PNG nebo JPG)."] },
};

function writeDeps(): NewsWriteDeps {
  return { news: container.newsRepository, storage: container.storage };
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

  if (!isValidNewsImage(imageUrl, imageKey)) return INVALID_IMAGE;

  const result = await createNews(writeDeps(), {
    title,
    message,
    image: { imageUrl, imageKey },
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
    if (!isValidNewsImage(imageUrl, imageKey)) return INVALID_IMAGE;
    image = { imageUrl, imageKey };
  }

  const result = await updateNews(writeDeps(), id, { title, message, image });
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
