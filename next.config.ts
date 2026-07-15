import type { NextConfig } from "next";

// Existing images live on S3 + CloudFront (see legacy data). Keep these hosts allow-listed
// so historical `imageUrl` values render through next/image unchanged.
const S3_HOST = "zive-teplice.s3.eu-central-1.amazonaws.com";
const CLOUDFRONT_HOST = "d374dusjcsfayx.cloudfront.net";

// Also allow whatever public host NEW uploads are served from (the storage adapter
// builds `imageUrl` from S3_PUBLIC_HOST). In dev this is often the test bucket's S3
// host; in prod it's typically the CloudFront host above. Derived from env so no
// test-only hostname is hardcoded here.
const uploadHost = process.env.S3_PUBLIC_HOST?.trim();

// The browser PUTs the file straight to S3 using a presigned URL (see
// src/server/infrastructure/storage/s3.ts) — the AWS SDK signs that against the
// bucket's raw virtual-hosted-style endpoint, which is NOT necessarily uploadHost
// (that may point at a CDN instead). Needed for connect-src, independent of img-src.
const region = process.env.AWS_REGION?.trim();
const bucket = process.env.AWS_BUCKET_NAME?.trim();
const s3UploadEndpointHost =
  region && bucket ? `${bucket}.s3.${region}.amazonaws.com` : null;

const imageHosts = [
  S3_HOST,
  CLOUDFRONT_HOST,
  ...(uploadHost && ![S3_HOST, CLOUDFRONT_HOST].includes(uploadHost)
    ? [uploadHost]
    : []),
];

// Content-Security-Policy — curated static policy (see docs/plans/phase-6
// gotcha #6). Next injects some inline <style>/<script>, so 'unsafe-inline'
// is required for script-src/style-src until a nonce-based approach replaces
// this. Enforced in production, verified violation-free against a `next
// build && next start` run (dialogs, debounced search, forms). Kept as
// Report-Only in dev: Turbopack's HMR runtime relies on `eval`, which a
// strict script-src would otherwise break.
const imageOrigins = imageHosts.map((hostname) => `https://${hostname}`);
const uploadOrigin = s3UploadEndpointHost
  ? `https://${s3UploadEndpointHost}`
  : null;
const isProduction = process.env.NODE_ENV === "production";
const cspHeaderKey = isProduction
  ? "Content-Security-Policy"
  : "Content-Security-Policy-Report-Only";

const cspDirectives = [
  `default-src 'self'`,
  // blob: is required for client-side crop previews of a locally-selected file
  // (createObjectURL), before it's ever uploaded.
  `img-src 'self' data: blob: ${imageOrigins.join(" ")}`,
  `script-src 'self' 'unsafe-inline'`,
  `style-src 'self' 'unsafe-inline'`,
  `font-src 'self' data:`,
  // Browser PUTs uploads directly to S3 via a presigned URL (bypasses Vercel's
  // body-size limit) — that request needs the S3 host allow-listed here too.
  // blob: is required because the crop dialog fetch()es the locally-selected
  // file's object URL to read its pixel data before cropping/uploading.
  `connect-src 'self' blob: ${uploadOrigin ?? ""}`.trim(),
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
];

const nextConfig: NextConfig = {
  // Mongoose is a server-only Node package; keep it out of the bundler so its
  // dynamic requires and native optional deps resolve at runtime.
  serverExternalPackages: ["mongoose"],
  images: {
    remotePatterns: imageHosts.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: cspHeaderKey,
            value: cspDirectives.join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
