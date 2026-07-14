"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createGalleryAction } from "@/server/actions/gallery";
import type { FieldErrors } from "@/server/domain/result";
import {
  ImageUpload,
  type UploadedImage,
} from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";

const inputClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export function GalleryCreateForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [featured, setFeatured] = useState<UploadedImage | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function fieldError(field: string): string | undefined {
    return fieldErrors[field]?.[0];
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    if (!featured) {
      setFieldErrors({ image: ["Nahrajte prosím úvodní obrázek."] });
      return;
    }

    startTransition(async () => {
      const result = await createGalleryAction({
        name,
        imageUrl: featured.imageUrl,
        imageKey: featured.imageKey,
      });
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success("Galerie byla vytvořena. Nyní nahrajte fotky.");
      router.push(`/admin/galerie/${result.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Název galerie
        </label>
        <input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={4}
          maxLength={15}
          aria-invalid={fieldError("name") ? true : undefined}
          aria-describedby={fieldError("name") ? "name-error" : undefined}
          className={inputClass}
        />
        {fieldError("name") ? (
          <p id="name-error" role="alert" className="text-destructive text-sm">
            {fieldError("name")}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">4–15 znaků.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="featured" className="text-sm font-medium">
          Úvodní obrázek
        </label>
        <ImageUpload
          id="featured"
          prefix="gallery"
          value={featured}
          onChange={setFeatured}
          ariaInvalid={fieldError("image") ? true : undefined}
          ariaDescribedby={fieldError("image") ? "featured-error" : undefined}
        />
        {fieldError("image") ? (
          <p
            id="featured-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {fieldError("image")}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Vytvářím…" : "Vytvořit galerii"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={pending}
          onClick={() => router.push("/admin/galerie")}
        >
          Zrušit
        </Button>
      </div>
    </form>
  );
}
