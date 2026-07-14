"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updatePerformerAction,
  type PerformerActionResult,
} from "@/server/actions/performers";
import type { FieldErrors } from "@/server/domain/result";
import {
  ImageUpload,
  type UploadedImage,
} from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";

const inputClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export type AccountProfileInitial = {
  username: string;
  phoneNumber: string;
  description: string;
  image: UploadedImage | null;
};

export function AccountProfileForm({
  performerId,
  initial,
}: {
  performerId: string;
  initial: AccountProfileInitial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [image, setImage] = useState<UploadedImage | null>(initial.image);
  // Only a freshly uploaded image is re-submitted (and re-validated); leaving the
  // prefilled one untouched preserves it — legacy keys may predate the prefix rule.
  const [imageReplaced, setImageReplaced] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function fieldError(name: string): string | undefined {
    return fieldErrors[name]?.[0];
  }

  function handleImageChange(next: UploadedImage | null) {
    setImage(next);
    setImageReplaced(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const replacement = imageReplaced ? image : null;

    startTransition(async () => {
      const result: PerformerActionResult = await updatePerformerAction(
        performerId,
        {
          username: String(form.get("username") ?? ""),
          phoneNumber: String(form.get("phoneNumber") ?? ""),
          description: String(form.get("description") ?? ""),
          imageUrl: replacement?.imageUrl,
          imageKey: replacement?.imageKey,
        },
      );

      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success("Profil byl uložen.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-sm font-medium">
          Jméno / název
        </label>
        <input
          id="username"
          name="username"
          defaultValue={initial.username}
          required
          minLength={3}
          maxLength={50}
          aria-invalid={fieldError("username") ? true : undefined}
          aria-describedby={
            fieldError("username") ? "username-error" : undefined
          }
          className={inputClass}
        />
        {fieldError("username") ? (
          <p
            id="username-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {fieldError("username")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="phoneNumber" className="text-sm font-medium">
          Telefon
        </label>
        <input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          defaultValue={initial.phoneNumber}
          required
          aria-invalid={fieldError("phoneNumber") ? true : undefined}
          aria-describedby={
            fieldError("phoneNumber") ? "phoneNumber-error" : undefined
          }
          className={inputClass}
        />
        {fieldError("phoneNumber") ? (
          <p
            id="phoneNumber-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {fieldError("phoneNumber")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Popis <span className="text-muted-foreground">(nepovinné)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={1000}
          defaultValue={initial.description}
          aria-invalid={fieldError("description") ? true : undefined}
          aria-describedby={
            fieldError("description") ? "description-error" : undefined
          }
          className={`${inputClass} h-auto py-2`}
        />
        {fieldError("description") ? (
          <p
            id="description-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {fieldError("description")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="image" className="text-sm font-medium">
          Profilový obrázek
        </label>
        <ImageUpload
          id="image"
          prefix="performer"
          alt="Náhled profilového obrázku"
          value={image}
          onChange={handleImageChange}
          ariaInvalid={fieldError("image") ? true : undefined}
          ariaDescribedby={
            fieldError("image") ? "image-field-error" : undefined
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
        ) : null}
      </div>

      <Button type="submit" size="lg" disabled={pending} className="self-start">
        {pending ? "Ukládám…" : "Uložit změny"}
      </Button>
    </form>
  );
}
