import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/ucet",
        "/prihlaseni",
        "/registrace",
        "/obnova-hesla",
        "/api/",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
