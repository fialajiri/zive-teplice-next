import Image from "next/image";
import type { HomepageImageDto } from "@/server/domain/homepage-content";

// Renders both at the mobile 4:5 and desktop 16:9 aspect ratio via
// `object-cover` — the admin-uploaded image is cropped to 3:2, the ratio both
// current hero photos already have, which looks right in either box. `children`
// (the h1 + CTA overlay) is supplied by the caller so this component never
// duplicates the non-editable, event-driven CTA markup.
export function HomepageHero({
  image,
  priority = true,
  children,
}: {
  image: HomepageImageDto;
  /** false in the admin preview — it isn't the page's LCP image there. */
  priority?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl sm:aspect-[16/9]">
      <Image
        src={image.imageUrl}
        alt={image.alt}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 1024px, 100vw"
        className="object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
      />
      <div className="relative flex flex-col items-start gap-5 p-6 sm:p-10">
        {children}
      </div>
    </section>
  );
}
