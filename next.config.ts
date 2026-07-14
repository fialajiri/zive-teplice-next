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
const isProduction = process.env.NODE_ENV === "production";
const cspHeaderKey = isProduction
  ? "Content-Security-Policy"
  : "Content-Security-Policy-Report-Only";

const cspDirectives = [
  `default-src 'self'`,
  `img-src 'self' data: ${imageOrigins.join(" ")}`,
  `script-src 'self' 'unsafe-inline'`,
  `style-src 'self' 'unsafe-inline'`,
  `font-src 'self' data:`,
  `connect-src 'self'`,
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
