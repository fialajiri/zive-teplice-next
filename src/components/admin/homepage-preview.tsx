"use client";

import { HomepageHero } from "@/components/site/homepage-hero";
import { HeroCta } from "@/components/site/hero-cta";
import { AboutSection } from "@/components/site/about-section";
import type { HomepageContentDto } from "@/server/domain/homepage-content";

// Renders the exact components the public homepage uses, against the admin
// form's in-memory (unsaved) state — pixel-identical to production, updates
// instantly on every edit, no draft-then-publish round trip to the database.
export function HomepagePreview({ content }: { content: HomepageContentDto }) {
  return (
    <div className="flex flex-col gap-10 rounded-lg border p-4">
      <HomepageHero image={content.heroImage} priority={false}>
        <h1 className="font-heading text-4xl text-balance text-white sm:text-6xl">
          Živé Teplice
        </h1>
        <HeroCta currentEvent={null} registrationOpen={false} />
      </HomepageHero>
      <AboutSection
        aboutText={content.aboutText}
        aboutImage={content.aboutImage}
        highlights={content.highlights}
      />
    </div>
  );
}
