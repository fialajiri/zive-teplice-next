import type { MetadataRoute } from "next";
import { container } from "@/server/container";
import { getSiteUrl } from "@/lib/site-url";

// Always fresh — content changes per-request just like the pages themselves.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const [news, galleries, performers, archiveYears] = await Promise.all([
    container.newsRepository.list(),
    container.galleryRepository.list(),
    container.performerRepository.list(),
    container.newsRepository.listDistinctYears(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/aktuality`, changeFrequency: "daily", priority: 0.8 },
    {
      url: `${base}/aktuality/archiv`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    { url: `${base}/program`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/galerie`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/ucinkujici`, changeFrequency: "weekly", priority: 0.6 },
    {
      url: `${base}/ucinkujici/vsichni`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    { url: `${base}/kontakt`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const newsRoutes: MetadataRoute.Sitemap = news.map((item) => ({
    url: `${base}/aktuality/${item.id}`,
    lastModified: item.updatedAt,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const archiveYearRoutes: MetadataRoute.Sitemap = archiveYears.map((year) => ({
    url: `${base}/aktuality/archiv/${year}`,
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  const galleryRoutes: MetadataRoute.Sitemap = galleries.map((gallery) => ({
    url: `${base}/galerie/${gallery.id}`,
    lastModified: gallery.updatedAt,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const performerRoutes: MetadataRoute.Sitemap = performers.map(
    (performer) => ({
      url: `${base}/ucinkujici/${performer.id}`,
      changeFrequency: "monthly",
      priority: 0.4,
    }),
  );

  return [
    ...staticRoutes,
    ...newsRoutes,
    ...archiveYearRoutes,
    ...galleryRoutes,
    ...performerRoutes,
  ];
}
