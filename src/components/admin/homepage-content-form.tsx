"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  HomepageImageField,
  type HomepageImageFieldValue,
} from "@/components/admin/homepage-image-field";
import { HomepageHighlightFields } from "@/components/admin/homepage-highlight-fields";
import { HomepagePreview } from "@/components/admin/homepage-preview";
import { updateHomepageContentAction } from "@/server/actions/homepage-content";
import { HIGHLIGHT_ICONS } from "@/components/site/about-section";
import type {
  HomepageContentDto,
  HomepageHighlightDto,
  HomepageHighlightsDto,
} from "@/server/domain/homepage-content";

const ABOUT_TEXT_MIN = 50;
const ABOUT_TEXT_MAX = 600;
const inputClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-3";

// Client-side mirror of the server Zod bounds: catches out-of-range input
// before it's ever submitted, so the admin practically never hits the
// server-side rejection path (still the authoritative safety net).
function collectErrors(
  heroImage: HomepageImageFieldValue,
  aboutImage: HomepageImageFieldValue,
  aboutText: string,
  highlights: HomepageHighlightsDto,
): string[] {
  const errors: string[] = [];
  if (!heroImage.imageUrl) errors.push("Vyberte úvodní fotku.");
  if (!heroImage.alt.trim()) errors.push("Vyplňte popisek úvodní fotky.");
  if (!aboutImage.imageUrl) errors.push("Vyberte fotku k textu o festivalu.");
  if (!aboutImage.alt.trim()) {
    errors.push("Vyplňte popisek fotky k textu o festivalu.");
  }
  if (
    aboutText.trim().length < ABOUT_TEXT_MIN ||
    aboutText.length > ABOUT_TEXT_MAX
  ) {
    errors.push(
      `Text o festivalu musí mít ${ABOUT_TEXT_MIN}–${ABOUT_TEXT_MAX} znaků.`,
    );
  }
  highlights.forEach((highlight, index) => {
    if (highlight.title.trim().length < 3 || highlight.title.length > 32) {
      errors.push(`Nadpis u ikony č. ${index + 1} musí mít 3–32 znaků.`);
    }
    if (
      highlight.description.trim().length < 10 ||
      highlight.description.length > 100
    ) {
      errors.push(`Popis u ikony č. ${index + 1} musí mít 10–100 znaků.`);
    }
  });
  return errors;
}

export function HomepageContentForm({
  content,
}: {
  content: HomepageContentDto;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [heroImage, setHeroImage] = useState<HomepageImageFieldValue>(
    content.heroImage,
  );
  const [aboutImage, setAboutImage] = useState<HomepageImageFieldValue>(
    content.aboutImage,
  );
  const [aboutText, setAboutText] = useState(content.aboutText);
  const [highlights, setHighlights] = useState<HomepageHighlightsDto>(
    content.highlights,
  );

  const errors = useMemo(
    () => collectErrors(heroImage, aboutImage, aboutText, highlights),
    [heroImage, aboutImage, aboutText, highlights],
  );

  function updateHighlight(index: number, next: HomepageHighlightDto) {
    setHighlights((prev) => {
      const copy = [...prev] as HomepageHighlightDto[];
      copy[index] = next;
      // Safe: always exactly 4 elements — we only ever replace an existing
      // index, never push/splice.
      return copy as unknown as HomepageHighlightsDto;
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateHomepageContentAction({
        heroImage,
        aboutText: aboutText.trim(),
        aboutImage,
        highlights,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Úvodní stránka byla uložena.");
      router.refresh();
    });
  }

  const previewContent: HomepageContentDto = {
    heroImage,
    aboutText,
    aboutImage,
    highlights,
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <HomepageImageField
          label="Úvodní fotka"
          altLabel="Popisek fotky (pro čtečky obrazovky)"
          value={heroImage}
          onChange={setHeroImage}
          prefix="homepageHero"
          aspectRatio={3 / 2}
          previewAlt="Náhled úvodní fotky"
        />

        <div className="border-border/60 flex flex-col gap-2 rounded-lg border p-4">
          <label htmlFor="aboutText" className="text-sm font-medium">
            Text „O festivalu“
          </label>
          <textarea
            id="aboutText"
            value={aboutText}
            maxLength={ABOUT_TEXT_MAX}
            rows={6}
            onChange={(event) => setAboutText(event.target.value)}
            className={cn(inputClass, "h-auto")}
          />
          <span className="text-muted-foreground text-xs">
            {aboutText.length}/{ABOUT_TEXT_MAX}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {highlights.map((highlight, index) => (
            <HomepageHighlightFields
              key={index}
              index={index}
              icon={HIGHLIGHT_ICONS[index]}
              highlight={highlight}
              onChange={(next) => updateHighlight(index, next)}
            />
          ))}
        </div>

        <HomepageImageField
          label="Fotka k textu o festivalu"
          altLabel="Popisek fotky (pro čtečky obrazovky)"
          value={aboutImage}
          onChange={setAboutImage}
          prefix="homepageAbout"
          aspectRatio={4 / 5}
          previewAlt="Náhled fotky k textu o festivalu"
        />

        {errors.length > 0 ? (
          <ul className="text-destructive flex flex-col gap-1 text-sm">
            {errors.map((message) => (
              <li key={message} role="alert">
                {message}
              </li>
            ))}
          </ul>
        ) : null}

        <div>
          <Button
            type="button"
            disabled={pending || errors.length > 0}
            onClick={handleSave}
          >
            {pending ? "Ukládám…" : "Uložit změny"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-sm font-medium">
          Náhled
        </span>
        <span className="text-muted-foreground text-xs">
          Zobrazuje se v aktuální šířce vašeho okna prohlížeče — pro kontrolu
          mobilního zobrazení zmenšete okno.
        </span>
        <HomepagePreview content={previewContent} />
      </div>
    </div>
  );
}
