import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { container } from "@/server/container";
import { listNews } from "@/server/application/news";
import { getCurrentEvent } from "@/server/application/events";
import { getRegistrationOpen } from "@/server/application/settings";
import { getHomepageContent } from "@/server/application/homepage-content";
import { NewsCard } from "@/components/site/news-card";
import { HomepageHero } from "@/components/site/homepage-hero";
import { HeroCta } from "@/components/site/hero-cta";
import { AboutSection } from "@/components/site/about-section";

// Always server-rendered so admin changes appear immediately (no ISR window).
export const dynamic = "force-dynamic";

// Sponsor logos are a fixed, hand-curated set (not admin-editable content),
// same as the legacy site — hence a plain static array rather than a CMS read.
// Per-logo height classes (not one uniform size): the source files have very
// different native aspect ratios, and Sayfy's circular badge needs more
// height than the others to keep its ring text legible.
const SPONSORS = [
  {
    src: "/img/support/dek.png",
    alt: "Stavebniny DEK",
    width: 800,
    height: 408,
    className: "h-7 sm:h-8",
  },
  {
    src: "/img/support/teplice.png",
    alt: "Statutární město Teplice",
    width: 1039,
    height: 304,
    className: "h-5 sm:h-6",
  },
  {
    src: "/img/support/sayfy.webp",
    alt: "Sayfy z.s.",
    width: 585,
    height: 587,
    className: "h-8 sm:h-9",
  },
  {
    // White-only artwork with no colored variant — swap in a black version
    // for light mode instead of leaving it invisible on a light background.
    srcLight: "/img/support/kudyznudy-black.png",
    srcDark: "/img/support/kudyznudy.png",
    alt: "Kudy z nudy",
    width: 3326,
    height: 734,
    href: "https://www.kudyznudy.cz/",
    className: "h-5 sm:h-6",
  },
  {
    src: "/img/support/ulicnik.png",
    alt: "Uličník",
    width: 1540,
    height: 495,
    className: "h-5 sm:h-6",
  },
] as const;

// Awaits a single fast singleton-doc read before returning JSX (no new
// Suspense boundary around hero/about), so the hero image (LCP) and the about
// section still ship as part of the initial flushed HTML. Only the
// data-dependent slivers below suspend, each with a fallback close enough in
// shape to the resolved content to avoid layout shift — see
// docs/plans/phase-7-backlog.md perf notes.
export default async function HomePage() {
  const content = await getHomepageContent(container.homepageContentRepository);

  return (
    <div className="flex flex-col gap-16">
      <HomepageHero image={content.heroImage}>
        <h1 className="font-heading text-4xl text-balance text-white sm:text-6xl">
          Živé Teplice
        </h1>
        <Suspense
          fallback={<HeroCta currentEvent={null} registrationOpen={false} />}
        >
          <HeroCtaSection />
        </Suspense>
      </HomepageHero>

      <AboutSection
        aboutText={content.aboutText}
        aboutImage={content.aboutImage}
        highlights={content.highlights}
      />

      <Suspense fallback={<LatestNewsSkeleton />}>
        <LatestNewsSection />
      </Suspense>

      <SponsorsSection />
    </div>
  );
}

async function HeroCtaSection() {
  const [eventResult, registrationOpen] = await Promise.all([
    getCurrentEvent(container.eventRepository),
    getRegistrationOpen(container.settingsRepository),
  ]);
  const currentEvent = eventResult.ok ? eventResult.value : null;

  return (
    <HeroCta currentEvent={currentEvent} registrationOpen={registrationOpen} />
  );
}

async function LatestNewsSection() {
  const newsResult = await listNews(container.newsRepository);
  const latestNews = newsResult.ok ? newsResult.value.slice(0, 3) : [];

  if (latestNews.length === 0) return null;

  return (
    <section aria-labelledby="home-news-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="home-news-heading" className="font-heading text-2xl">
          Nejnovější aktuality
        </h2>
        <Link
          href="/aktuality"
          className="text-primary text-sm hover:underline"
        >
          Všechny aktuality
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {latestNews.map((news) => (
          <NewsCard key={news.id} news={news} />
        ))}
      </div>
    </section>
  );
}

function LatestNewsSkeleton() {
  return (
    <section aria-hidden="true">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <div className="bg-muted h-8 w-48 animate-pulse rounded-md" />
        <div className="bg-muted h-4 w-28 animate-pulse rounded-md" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border-border/60 overflow-hidden rounded-xl border"
          >
            <div className="bg-muted aspect-[16/9] animate-pulse" />
            <div className="flex flex-col gap-2 p-5">
              <div className="bg-muted h-3 w-20 animate-pulse rounded" />
              <div className="bg-muted h-5 w-3/4 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SponsorsSection() {
  return (
    <section
      aria-labelledby="home-sponsors-heading"
      className="mt-6 -mb-10 text-center sm:mt-8 sm:-mb-12"
    >
      <h2 id="home-sponsors-heading" className="font-heading text-xl">
        Děkujeme za podporu
      </h2>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:mt-8 sm:gap-x-6">
        {SPONSORS.map((sponsor) => {
          const imageClassName = `w-auto object-contain ${sponsor.className}`;
          const logo =
            "srcLight" in sponsor ? (
              <>
                <Image
                  src={sponsor.srcLight}
                  alt={sponsor.alt}
                  width={sponsor.width}
                  height={sponsor.height}
                  className={`block dark:hidden ${imageClassName}`}
                />
                <Image
                  src={sponsor.srcDark}
                  alt={sponsor.alt}
                  width={sponsor.width}
                  height={sponsor.height}
                  className={`hidden dark:block ${imageClassName}`}
                />
              </>
            ) : (
              <Image
                src={sponsor.src}
                alt={sponsor.alt}
                width={sponsor.width}
                height={sponsor.height}
                className={imageClassName}
              />
            );

          return "href" in sponsor ? (
            <a
              key={sponsor.alt}
              href={sponsor.href}
              target="_blank"
              rel="noreferrer noopener"
              className="opacity-90 transition-opacity hover:opacity-100"
            >
              {logo}
            </a>
          ) : (
            <div key={sponsor.alt} className="opacity-90">
              {logo}
            </div>
          );
        })}
      </div>
    </section>
  );
}
