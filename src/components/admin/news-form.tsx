"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createNewsAction,
  updateNewsAction,
  type NewsActionResult,
} from "@/server/actions/news";
import type { FieldErrors } from "@/server/domain/result";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import {
  ImageUpload,
  type UploadedImage,
} from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";

const inputClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export type NewsFormInitial = {
  title: string;
  message: string;
  image: UploadedImage | null;
  secondaryImage: UploadedImage | null;
};

type NewsFormProps =
  | { mode: "create"; newsId?: undefined; initial?: undefined }
  | { mode: "edit"; newsId: string; initial: NewsFormInitial };

export function NewsForm({ mode, newsId, initial }: NewsFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [message, setMessage] = useState(initial?.message ?? "");
  const [image, setImage] = useState<UploadedImage | null>(
    initial?.image ?? null,
  );
  // Only a freshly uploaded image is re-submitted on edit. Leaving the prefilled
  // image untouched sends no image fields, so the existing one is preserved and
  // never re-validated (legacy keys may predate the `news/` prefix rule).
  const [imageReplaced, setImageReplaced] = useState(false);
  const [secondaryImage, setSecondaryImage] = useState<UploadedImage | null>(
    initial?.secondaryImage ?? null,
  );
  // Same "only send what changed" rule as the primary image, but tri-state: not
  // touched (omit), set/replaced (send it), or explicitly cleared (send removal).
  const [secondaryImageTouched, setSecondaryImageTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function fieldError(name: string): string | undefined {
    return fieldErrors[name]?.[0];
  }

  function handleImageChange(next: UploadedImage | null) {
    setImage(next);
    setImageReplaced(true);
  }

  function handleSecondaryImageChange(next: UploadedImage | null) {
    setSecondaryImage(next);
    setSecondaryImageTouched(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    // Image is required on create; on edit it's only sent when replaced.
    if (mode === "create" && !image) {
      setFieldErrors({ image: ["Nahrajte prosím obrázek."] });
      return;
    }

    // On edit, send the image only when the admin uploaded a new one.
    const replacement = imageReplaced ? image : null;

    startTransition(async () => {
      const result: NewsActionResult =
        mode === "create"
          ? await createNewsAction({
              title,
              message,
              imageUrl: image?.imageUrl ?? "",
              imageKey: image?.imageKey ?? "",
              secondaryImageUrl: secondaryImage?.imageUrl,
              secondaryImageKey: secondaryImage?.imageKey,
              secondaryImageWidth: secondaryImage?.width,
              secondaryImageHeight: secondaryImage?.height,
            })
          : await updateNewsAction(newsId, {
              title,
              message,
              imageUrl: replacement?.imageUrl,
              imageKey: replacement?.imageKey,
              secondaryImageUrl: secondaryImageTouched
                ? (secondaryImage?.imageUrl ?? undefined)
                : undefined,
              secondaryImageKey: secondaryImageTouched
                ? (secondaryImage?.imageKey ?? undefined)
                : undefined,
              secondaryImageWidth: secondaryImageTouched
                ? secondaryImage?.width
                : undefined,
              secondaryImageHeight: secondaryImageTouched
                ? secondaryImage?.height
                : undefined,
              removeSecondaryImage: secondaryImageTouched && !secondaryImage,
            });

      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "create" ? "Aktualita byla vytvořena." : "Změny byly uloženy.",
      );
      router.push("/admin/aktuality");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Titulek
        </label>
        <input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={10}
          maxLength={75}
          aria-invalid={fieldError("title") ? true : undefined}
          aria-describedby={fieldError("title") ? "title-error" : undefined}
          className={inputClass}
        />
        {fieldError("title") ? (
          <p id="title-error" role="alert" className="text-destructive text-sm">
            {fieldError("title")}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">10–75 znaků.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-sm font-medium">
          Obsah
        </label>
        <RichTextEditor
          id="message"
          value={message}
          onChange={setMessage}
          ariaInvalid={fieldError("message") ? true : undefined}
          ariaDescribedby={fieldError("message") ? "message-error" : undefined}
        />
        {fieldError("message") ? (
          <p
            id="message-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {fieldError("message")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="image" className="text-sm font-medium">
          Obrázek (náhledový)
        </label>
        <ImageUpload
          id="image"
          aspectRatio={16 / 9}
          value={image}
          onChange={handleImageChange}
          ariaInvalid={fieldError("image") ? true : undefined}
          ariaDescribedby={
            fieldError("image") ? "image-field-error" : "image-field-hint"
          }
        />
        {fieldError("image") ? (
          <p
            id="image-field-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {fieldError("image")}
          </p>
        ) : (
          <p id="image-field-hint" className="text-muted-foreground text-xs">
            Ořízne se na poměr 16:9 a slouží jako náhled u výpisu aktualit i
            nahoře na detailu.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="secondary-image" className="text-sm font-medium">
          Druhý obrázek — celý, bez oříznutí (nepovinný)
        </label>
        <ImageUpload
          id="secondary-image"
          aspectRatio="original"
          value={secondaryImage}
          onChange={handleSecondaryImageChange}
          ariaInvalid={fieldError("secondaryImage") ? true : undefined}
          ariaDescribedby={
            fieldError("secondaryImage")
              ? "secondary-image-field-error"
              : "secondary-image-field-hint"
          }
        />
        {fieldError("secondaryImage") ? (
          <p
            id="secondary-image-field-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {fieldError("secondaryImage")}
          </p>
        ) : (
          <p
            id="secondary-image-field-hint"
            className="text-muted-foreground text-xs"
          >
            Zobrazí se celý, bez oříznutí, pod textem na detailu aktuality —
            vhodné pro plakát nebo mapu místa.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending
            ? "Ukládám…"
            : mode === "create"
              ? "Vytvořit aktualitu"
              : "Uložit změny"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={pending}
          onClick={() => router.push("/admin/aktuality")}
        >
          Zrušit
        </Button>
      </div>
    </form>
  );
}
