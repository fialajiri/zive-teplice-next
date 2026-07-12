import type { NextConfig } from "next";

// Existing images live on S3 + CloudFront (see legacy data). Keep these hosts allow-listed
// so historical `imageUrl` values render through next/image unchanged.
const S3_HOST = "zive-teplice.s3.eu-central-1.amazonaws.com";
const CLOUDFRONT_HOST = "d374dusjcsfayx.cloudfront.net";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: S3_HOST },
      { protocol: "https", hostname: CLOUDFRONT_HOST },
    ],
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
