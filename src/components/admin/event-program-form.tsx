"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  addProgramAction,
  updateProgramAction,
  type EventActionResult,
} from "@/server/actions/events";
import type { ProgramDto } from "@/server/domain/event";
import type { FieldErrors } from "@/server/domain/result";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import {
  ImageUpload,
  type UploadedImage,
} from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";

const inputClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export function EventProgramForm({
  eventId,
  program,
}: {
  eventId: string;
  program: ProgramDto | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEdit = program !== null;

  const [title, setTitle] = useState(program?.title ?? "");
  const [message, setMessage] = useState(program?.message ?? "");
  const [image, setImage] = useState<UploadedImage | null>(
    program?.image ?? null,
  );
  const [imageReplaced, setImageReplaced] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function fieldError(field: string): string | undefined {
    return fieldErrors[field]?.[0];
  }

  function handleImageChange(next: UploadedImage | null) {
    setImage(next);
    setImageReplaced(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    // Image is required when first adding a program; on edit only a freshly
    // uploaded replacement is re-submitted.
    if (!isEdit && !image) {
      setFieldErrors({ image: ["Nahrajte prosím obrázek programu."] });
      return;
    }

    const replacement = imageReplaced ? image : null;

    startTransition(async () => {
      const result: EventActionResult = isEdit
        ? await updateProgramAction(eventId, {
            title,
            message,
            imageUrl: replacement?.imageUrl,
            imageKey: replacement?.imageKey,
          })
        : await addProgramAction(eventId, {
            title,
            message,
            imageUrl: image?.imageUrl ?? "",
            imageKey: image?.imageKey ?? "",
          });

      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Program byl upraven." : "Program byl přidán.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="program-title" className="text-sm font-medium">
          Název programu
        </label>
        <input
          id="program-title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={10}
          maxLength={100}
          aria-invalid={fieldError("title") ? true : undefined}
          aria-describedby={
            fieldError("title") ? "program-title-error" : undefined
          }
          className={inputClass}
        />
        {fieldError("title") ? (
          <p
            id="program-title-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {fieldError("title")}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">10–100 znaků.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="program-message" className="text-sm font-medium">
          Obsah
        </label>
        <RichTextEditor
          id="program-message"
          value={message}
          onChange={setMessage}
          ariaInvalid={fieldError("message") ? true : undefined}
          ariaDescribedby={
            fieldError("message") ? "program-message-error" : undefined
          }
        />
        {fieldError("message") ? (
          <p
            id="program-message-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {fieldError("message")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="program-image" className="text-sm font-medium">
          Obrázek
        </label>
        <ImageUpload
          id="program-image"
          prefix="program"
          aspectRatio={16 / 9}
          value={image}
          onChange={handleImageChange}
          ariaInvalid={fieldError("image") ? true : undefined}
          ariaDescribedby={
            fieldError("image") ? "program-image-error" : undefined
          }
        />
        {fieldError("image") ? (
          <p
            id="program-image-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {fieldError("image")}
          </p>
        ) : null}
      </div>

      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Ukládám…" : isEdit ? "Uložit program" : "Přidat program"}
        </Button>
      </div>
    </form>
  );
}
