import "server-only";
import type { ImageDto } from "@/server/domain/news";

// Legacy image URLs are stored against the raw S3 origin. Those originals are
// full-resolution (10–16 MB), and next/image's optimizer has a hard-coded 7s upstream
// fetch timeout — large files fetched straight from S3 time out and render broken.
// Rewrite the S3 origin to the CloudFront CDN (edge-cached, same object keys, already
// allow-listed in next.config), which serves the same bytes ~4x faster. Non-destructive:
// the stored `imageUrl` in MongoDB is untouched; we only rewrite on read.
const S3_ORIGIN = "https://zive-teplice.s3.eu-central-1.amazonaws.com";
const CDN_ORIGIN = "https://d374dusjcsfayx.cloudfront.net";

export function toPublicUrl(url: string): string {
  return url.startsWith(S3_ORIGIN)
    ? CDN_ORIGIN + url.slice(S3_ORIGIN.length)
    : url;
}

// Legacy image subdocs are sometimes partially populated; only surface a complete pair.
export function toImageDto(
  image?: { imageUrl?: string; imageKey?: string } | null,
): ImageDto | null {
  if (!image?.imageUrl || !image?.imageKey) return null;
  return { imageUrl: toPublicUrl(image.imageUrl), imageKey: image.imageKey };
}
