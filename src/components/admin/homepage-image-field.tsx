"use client";

import {
  ImageUpload,
  type UploadedImage,
} from "@/components/admin/image-upload";

const inputClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export type HomepageImageFieldValue = {
  imageUrl: string;
  imageKey: string;
  alt: string;
};

// Shared by the hero and about image slots — identical markup, only the
// upload prefix/crop ratio/labels differ.
export function HomepageImageField({
  label,
  altLabel,
  value,
  onChange,
  prefix,
  aspectRatio,
  previewAlt,
}: {
  label: string;
  altLabel: string;
  value: HomepageImageFieldValue;
  onChange: (next: HomepageImageFieldValue) => void;
  prefix: "homepageHero" | "homepageAbout";
  aspectRatio: number;
  previewAlt: string;
}) {
  return (
    <div className="border-border/60 flex flex-col gap-3 rounded-lg border p-4">
      <span className="text-sm font-medium">{label}</span>
      <ImageUpload
        value={
          value.imageUrl
            ? { imageUrl: value.imageUrl, imageKey: value.imageKey }
            : null
        }
        onChange={(next: UploadedImage | null) =>
          onChange({
            imageUrl: next?.imageUrl ?? "",
            imageKey: next?.imageKey ?? "",
            alt: value.alt,
          })
        }
        prefix={prefix}
        aspectRatio={aspectRatio}
        alt={previewAlt}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${prefix}-alt`} className="text-sm font-medium">
          {altLabel}
        </label>
        <input
          id={`${prefix}-alt`}
          value={value.alt}
          maxLength={200}
          onChange={(event) => onChange({ ...value, alt: event.target.value })}
          className={inputClass}
        />
      </div>
    </div>
  );
}
