import Image from "next/image";
import { Music2, Palette, UtensilsCrossed, Users } from "lucide-react";
import type {
  HomepageHighlightsDto,
  HomepageImageDto,
} from "@/server/domain/homepage-content";

// Fixed icon per position — NOT admin-editable (see `homepage-content.ts`).
// Exported so the admin form can render the same icon next to each pair of
// editable fields, without a second source of truth for the icon order.
export const HIGHLIGHT_ICONS = [
  Music2,
  UtensilsCrossed,
  Palette,
  Users,
] as const;

export function AboutSection({
  aboutText,
  aboutImage,
  highlights,
}: {
  aboutText: string;
  aboutImage: HomepageImageDto;
  highlights: HomepageHighlightsDto;
}) {
  return (
    <section
      aria-labelledby="home-about-heading"
      className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center"
    >
      <div className="flex flex-col gap-6 lg:order-1">
        <div className="flex flex-col gap-3">
          <h2 id="home-about-heading" className="font-heading text-2xl">
            O festivalu
          </h2>
          <p className="text-muted-foreground max-w-3xl text-pretty">
            {aboutText}
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {highlights.map((item, index) => {
            const Icon = HIGHLIGHT_ICONS[index];
            return (
              <div key={index} className="flex flex-col gap-2">
                <Icon
                  aria-hidden="true"
                  className="text-primary size-7"
                  strokeWidth={1.75}
                />
                <p className="font-medium">{item.title}</p>
                <p className="text-muted-foreground text-sm text-pretty">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      <div className="bg-muted relative aspect-4/5 overflow-hidden rounded-2xl">
        <Image
          src={aboutImage.imageUrl}
          alt={aboutImage.alt}
          fill
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="object-cover"
        />
      </div>
    </section>
  );
}
