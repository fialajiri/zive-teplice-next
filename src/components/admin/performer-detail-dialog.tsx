"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { PencilIcon } from "lucide-react";
import type { PerformerAccountDto } from "@/server/domain/performer";
import type { FieldErrors } from "@/server/domain/result";
import {
  updatePerformerAction,
  type PerformerActionResult,
} from "@/server/actions/performers";
import { ParticipationStatusBadge } from "@/components/admin/participation-status-badge";
import {
  ImageUpload,
  type UploadedImage,
} from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const inputClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

// Profile summary — image, contact info, participation status, description.
// Fed entirely from the already-fetched row data. Controlled: opened via
// PerformerRow's click handler on the row. "Upravit" switches phoneNumber,
// description and image into an editable form (username/email/request stay
// read-only here — those change through the dedicated participation actions).
export function PerformerDetailDialog({
  performer,
  open,
  onOpenChange,
}: {
  performer: PerformerAccountDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [phoneNumber, setPhoneNumber] = useState(performer.phoneNumber);
  const [description, setDescription] = useState(performer.description);
  const [image, setImage] = useState<UploadedImage | null>(performer.image);
  const [imageReplaced, setImageReplaced] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function fieldError(name: string): string | undefined {
    return fieldErrors[name]?.[0];
  }

  function handleOpenChange(next: boolean) {
    if (!next) setEditing(false);
    onOpenChange(next);
  }

  function startEditing() {
    setPhoneNumber(performer.phoneNumber);
    setDescription(performer.description);
    setImage(performer.image);
    setImageReplaced(false);
    setFieldErrors({});
    setEditing(true);
  }

  function handleImageChange(next: UploadedImage | null) {
    setImage(next);
    setImageReplaced(true);
  }

  function handleSave() {
    setFieldErrors({});
    const replacement = imageReplaced ? image : null;

    startTransition(async () => {
      const result: PerformerActionResult = await updatePerformerAction(
        performer.id,
        {
          username: performer.username,
          phoneNumber,
          description,
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
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <div className="flex flex-col gap-3 pt-2">
          {editing ? (
            <ImageUpload
              id="performer-image"
              prefix="performer"
              aspectRatio={4 / 3}
              alt="Náhled profilového obrázku"
              value={image}
              onChange={handleImageChange}
              ariaInvalid={fieldError("image") ? true : undefined}
              ariaDescribedby={
                fieldError("image") ? "performer-image-error" : undefined
              }
            />
          ) : (
            <div className="bg-muted relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg">
              {performer.image ? (
                <Image
                  src={performer.image.imageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 32rem, 100vw"
                  className="object-cover"
                />
              ) : null}
            </div>
          )}
          {fieldError("image") ? (
            <p
              id="performer-image-error"
              role="alert"
              className="text-destructive text-sm"
            >
              {fieldError("image")}
            </p>
          ) : null}
          <DialogHeader>
            <DialogTitle className="text-lg">{performer.username}</DialogTitle>
          </DialogHeader>
        </div>

        <dl className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted-foreground">E-mail</dt>
          <dd>{performer.email}</dd>

          <dt className="text-muted-foreground pt-2">Telefon</dt>
          <dd>
            {editing ? (
              <>
                <input
                  id="performer-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  required
                  aria-invalid={fieldError("phoneNumber") ? true : undefined}
                  aria-describedby={
                    fieldError("phoneNumber")
                      ? "performer-phone-error"
                      : undefined
                  }
                  className={inputClass}
                />
                {fieldError("phoneNumber") ? (
                  <p
                    id="performer-phone-error"
                    role="alert"
                    className="text-destructive mt-1 text-sm"
                  >
                    {fieldError("phoneNumber")}
                  </p>
                ) : null}
              </>
            ) : (
              performer.phoneNumber
            )}
          </dd>

          <dt className="text-muted-foreground">Účast</dt>
          <dd>
            <ParticipationStatusBadge status={performer.request} />
          </dd>

          {editing || performer.description ? (
            <>
              <dt className="text-muted-foreground pt-2">Popis</dt>
              <dd className="whitespace-pre-wrap">
                {editing ? (
                  <>
                    <textarea
                      id="performer-description"
                      rows={4}
                      maxLength={1000}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      aria-invalid={
                        fieldError("description") ? true : undefined
                      }
                      aria-describedby={
                        fieldError("description")
                          ? "performer-description-error"
                          : undefined
                      }
                      className={`${inputClass} h-auto py-2`}
                    />
                    {fieldError("description") ? (
                      <p
                        id="performer-description-error"
                        role="alert"
                        className="text-destructive mt-1 text-sm"
                      >
                        {fieldError("description")}
                      </p>
                    ) : null}
                  </>
                ) : (
                  performer.description
                )}
              </dd>
            </>
          ) : null}
        </dl>

        <DialogFooter>
          {editing ? (
            <>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setEditing(false)}
              >
                Zrušit
              </Button>
              <Button type="button" disabled={pending} onClick={handleSave}>
                {pending ? "Ukládám…" : "Uložit"}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={startEditing}>
              <PencilIcon />
              Upravit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
