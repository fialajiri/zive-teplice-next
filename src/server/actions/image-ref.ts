import type { UploadPrefix } from "@/schemas/upload";

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
// arbitrary key/host: the key must live under `<prefix>/`, the URL must be https
// on an allow-listed host, and the URL must resolve to exactly that key. Shared by
// the news, gallery, and program actions (each passes its own prefix).
export function isValidUploadedImage(
  imageUrl: string,
  imageKey: string,
  prefix: UploadPrefix,
): boolean {
  if (!imageKey.startsWith(`${prefix}/`) || imageKey.includes("..")) {
    return false;
  }
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
