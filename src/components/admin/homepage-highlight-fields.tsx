"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HomepageHighlightDto } from "@/server/domain/homepage-content";

const inputClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

const TITLE_MAX = 32;
const DESCRIPTION_MAX = 100;

// One highlight's title/description inputs. The icon is fixed per position
// (not editable) — shown here only so the admin can see which card they're
// editing, matching the order rendered on the public page.
export function HomepageHighlightFields({
  index,
  icon: Icon,
  highlight,
  onChange,
}: {
  index: number;
  icon: LucideIcon;
  highlight: HomepageHighlightDto;
  onChange: (next: HomepageHighlightDto) => void;
}) {
  const titleId = `highlight-${index}-title`;
  const descriptionId = `highlight-${index}-description`;

  return (
    <div className="border-border/60 flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Icon
          aria-hidden="true"
          className="text-primary size-5"
          strokeWidth={1.75}
        />
        <span className="text-muted-foreground text-xs">
          Ikona č. {index + 1} (nelze změnit)
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={titleId} className="text-sm font-medium">
          Nadpis
        </label>
        <input
          id={titleId}
          value={highlight.title}
          maxLength={TITLE_MAX}
          onChange={(event) =>
            onChange({ ...highlight, title: event.target.value })
          }
          className={inputClass}
        />
        <span className="text-muted-foreground text-xs">
          {highlight.title.length}/{TITLE_MAX}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={descriptionId} className="text-sm font-medium">
          Popis
        </label>
        <textarea
          id={descriptionId}
          value={highlight.description}
          maxLength={DESCRIPTION_MAX}
          rows={2}
          onChange={(event) =>
            onChange({ ...highlight, description: event.target.value })
          }
          className={cn(inputClass, "h-auto py-2")}
        />
        <span className="text-muted-foreground text-xs">
          {highlight.description.length}/{DESCRIPTION_MAX}
        </span>
      </div>
    </div>
  );
}
