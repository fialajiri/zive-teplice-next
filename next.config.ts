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
        ],
      },
    ];
  },
};

export default nextConfig;
